package relay

import (
	"sync"
	"time"
)

type Chunk struct {
	Seq  int
	Data []byte
	Time time.Time
}

// TransferBuffer is a byte-aware queue that blocks senders when full
// and blocks receivers when empty. Adaptive backpressure mirrors the Python impl.
type TransferBuffer struct {
	TransferID string
	MaxBytes   int64
	CreatedAt  time.Time

	mu           sync.Mutex
	queue        []*Chunk
	CurrentBytes int64
	finished     bool
	SenderPaused bool

	consumptionRate float64
	lastConsumeTime time.Time

	// channel signals — buffered(1) so sends never block
	newChunk   chan struct{}
	spaceFreed chan struct{}
	done       chan struct{}
	closeOnce  sync.Once
}

func NewTransferBuffer(id string, maxMB int) *TransferBuffer {
	return &TransferBuffer{
		TransferID:      id,
		MaxBytes:        int64(maxMB) * 1024 * 1024,
		CreatedAt:       time.Now(),
		lastConsumeTime: time.Now(),
		newChunk:        make(chan struct{}, 1),
		spaceFreed:      make(chan struct{}, 1),
		done:            make(chan struct{}),
	}
}

// AddChunk blocks until there is space in the buffer, then enqueues the chunk.
// Returns false if the transfer was cancelled.
func (b *TransferBuffer) AddChunk(chunk *Chunk) bool {
	size := int64(len(chunk.Data))

	for {
		b.mu.Lock()
		if b.finished {
			b.mu.Unlock()
			return false
		}
		if b.CurrentBytes+size <= b.MaxBytes {
			b.queue = append(b.queue, chunk)
			b.CurrentBytes += size
			b.SenderPaused = b.shouldSenderPause()
			b.mu.Unlock()
			select { case b.newChunk <- struct{}{}: default: }
			return true
		}
		b.mu.Unlock()

		// Wait for the receiver to drain some space
		select {
		case <-b.spaceFreed:
		case <-b.done:
			return false
		}
	}
}

// GetChunk blocks until a chunk is available, returning nil when the transfer
// is finished and the queue is drained.
func (b *TransferBuffer) GetChunk() *Chunk {
	for {
		b.mu.Lock()
		if len(b.queue) > 0 {
			chunk := b.queue[0]
			b.queue = b.queue[1:]
			size := int64(len(chunk.Data))
			b.CurrentBytes -= size
			b.updateConsumptionRate(size)
			b.mu.Unlock()
			select { case b.spaceFreed <- struct{}{}: default: }
			return chunk
		}
		if b.finished {
			b.mu.Unlock()
			return nil
		}
		b.mu.Unlock()

		// Wait up to 5 s for a new chunk
		select {
		case <-b.newChunk:
		case <-time.After(5 * time.Second):
		case <-b.done:
		}

		// Re-check: if done and still empty, we're finished
		b.mu.Lock()
		empty := len(b.queue) == 0
		fin := b.finished
		b.mu.Unlock()
		if empty && fin {
			return nil
		}
	}
}

// Finish marks the buffer as done and unblocks all waiters.
func (b *TransferBuffer) Finish() {
	b.closeOnce.Do(func() {
		b.mu.Lock()
		b.finished = true
		b.mu.Unlock()
		close(b.done)
		select { case b.newChunk <- struct{}{}: default: }
		select { case b.spaceFreed <- struct{}{}: default: }
	})
}

// Pressure returns the fraction of buffer capacity currently used (0–1).
func (b *TransferBuffer) Pressure() float64 {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.MaxBytes == 0 {
		return 1.0
	}
	return float64(b.CurrentBytes) / float64(b.MaxBytes)
}

func (b *TransferBuffer) ShouldSenderPause() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.shouldSenderPause()
}

func (b *TransferBuffer) ConsumptionRate() float64 {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.consumptionRate
}

func (b *TransferBuffer) AvailableMB() float64 {
	b.mu.Lock()
	defer b.mu.Unlock()
	return float64(b.MaxBytes-b.CurrentBytes) / (1024 * 1024)
}

// shouldSenderPause must be called with b.mu held.
func (b *TransferBuffer) shouldSenderPause() bool {
	if b.MaxBytes == 0 {
		return true
	}
	pressure := float64(b.CurrentBytes) / float64(b.MaxBytes)
	switch {
	case b.consumptionRate > 5_000_000: // >5 MB/s — fast receiver
		return pressure >= 0.90
	case b.consumptionRate > 1_000_000: // >1 MB/s — medium receiver
		return pressure >= 0.70
	default: // slow receiver
		return pressure >= 0.50
	}
}

func (b *TransferBuffer) updateConsumptionRate(bytes int64) {
	now := time.Now()
	elapsed := now.Sub(b.lastConsumeTime).Seconds()
	if elapsed > 0 {
		rate := float64(bytes) / elapsed
		if b.consumptionRate == 0 {
			b.consumptionRate = rate
		} else {
			b.consumptionRate = 0.2*rate + 0.8*b.consumptionRate
		}
	}
	b.lastConsumeTime = now
}
