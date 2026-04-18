import { execSync } from "child_process";

async function globalTeardown() {
  console.log("Starting global teardown...");

  try {
    execSync("docker compose down --volumes --remove-orphans", {
      stdio: "inherit",
    });
    console.log("Global teardown completed successfully");
  } catch (error) {
    console.error("Global teardown failed:", error);
    throw error;
  }
}

export default globalTeardown;
