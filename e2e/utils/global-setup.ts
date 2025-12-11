import axios from 'axios';

const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000/api';

async function globalSetup() {
  console.log('Starting global setup...');

  try {
    // Wait for API to be ready
    let retries = 30;
    let apiReady = false;

    while (retries > 0 && !apiReady) {
      try {
        const response = await axios.get(`${apiURL}/`, {
          timeout: 5000,
        });
        if (response.status === 200 || response.status === 404) {
          apiReady = true;
          console.log('API is ready');
        }
      } catch (error) {
        retries--;
        if (retries > 0) {
          console.log(`Waiting for API... (${retries} retries left)`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    if (!apiReady) {
      throw new Error('API did not become ready in time');
    }

    console.log('Global setup completed successfully');
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;
