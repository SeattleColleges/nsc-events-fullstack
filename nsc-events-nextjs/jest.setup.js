import '@testing-library/jest-dom'

// Set environment variables for tests
// This must be in jest.setup.js because some components read process.env at module load time
process.env.NSC_EVENTS_PUBLIC_API_URL = 'http://localhost:3001';