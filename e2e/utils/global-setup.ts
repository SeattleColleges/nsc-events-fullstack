import axios from 'axios';

const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost/api';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost";

async function waitForService(
  url: string,
  label: string,
  retries = 30,
): Promise<void> {
  let remaining = retries;

  while (remaining > 0) {
    try {
      const response = await axios.get(url, { timeout: 5000 });
      if (response.status === 200) {
        console.log(`${label} is ready`);
        return;
      }
    } catch {
      remaining--;
      if (remaining > 0) {
        console.log(`Waiting for ${label}... (${remaining} retries left)`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  throw new Error(`${label} did not become ready in time`);
}

async function globalSetup() {
  console.log("Starting global setup...");

  try {
    await waitForService(`${apiURL}/health`, "API (NestJS)");
    await waitForService(`${baseURL}/`, "Frontend (Next.js)");
    console.log("Global setup completed successfully");
  } catch (error) {
    console.error("Global setup failed:", error);
    throw error;
  }
}

export default globalSetup;
