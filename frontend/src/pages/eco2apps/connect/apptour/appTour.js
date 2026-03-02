export const tourSteps = [
        {
            target: 'body',
            content: 'Welcome to Data Transfer! Share text and files instantly with anyone on your network.',
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '[data-tour="room-code"]',
            content: 'This is your unique Room Code. Share it with others so they can join you.',
        },
        {
            target: '[data-tour="join-room"]',
            content: 'Enter a code here to join an existing room created by someone else.',
        },
        {
            target: '[data-tour="create-join-btn"]',
            content: 'Or simply click "Create" to generate a new room code instantly.',
        },
        {
            target: '[data-tour="text-transfer"]',
            content: 'Send messages and text snippets in real-time here.',
        },
        {
            target: '[data-tour="file-transfer"]',
            content: 'Drag and drop files here to share them securely with connected users.',
        },
        {
            target: '[data-tour="encryption-info"]',
            content: 'Click this to Encrypt your files before sending.',
        },
    ];