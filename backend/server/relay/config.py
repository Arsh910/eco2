from django.conf import settings

# Buffer configuration
BUFFER_SIZE_MB = getattr(settings, 'RELAY_BUFFER_SIZE_MB', 64)
MAX_BUFFER_SIZE_MB = 128  # Hard limit
MIN_BUFFER_SIZE_MB = 16   # Minimum for performance

# Flow control thresholds
PAUSE_THRESHOLD_FAST = 0.9    # Pause at 90% for fast receivers
PAUSE_THRESHOLD_MEDIUM = 0.7  # Pause at 70% for medium receivers
PAUSE_THRESHOLD_SLOW = 0.5    # Pause at 50% for slow receivers

# Consumption rate thresholds (bytes/sec)
FAST_RECEIVER_RATE = 5_000_000   # 5 MB/s
MEDIUM_RECEIVER_RATE = 1_000_000 # 1 MB/s

# Session management
SESSION_TIMEOUT_SECONDS = 300  # 5 minutes
CLEANUP_INTERVAL_SECONDS = 60  # Run cleanup every 60s

# Backpressure detection
TWISTED_BUFFER_WARNING = 5_000_000   # 5MB
TWISTED_BUFFER_CRITICAL = 10_000_000 # 10MB

# Chunk size (for reference)
DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024  # 8MB
