import axios from "axios";

/**
 * Global teardown — removes all data created by Playwright during the test run.
 *
 * Strategy:
 *   1. Log in as the seed admin account.
 *   2. Fetch all users whose email ends in "@example.com" (the domain used by
 *      every test-data generator in this suite).
 *   3. Delete their events first (activities use SET NULL on creator delete,
 *      so we must remove events before users to avoid orphaned rows).
 *   4. Delete the test users.
 *
 * Seed users (@nsc.dev) are never touched.
 */

const API = process.env.PLAYWRIGHT_API_URL || "http://localhost:3000/api";
const ADMIN_CREDENTIALS = {
  email: "admin@nsc.dev",
  password: "admin@admin123",
};
const TEST_EMAIL_DOMAIN = "@example.com";

async function globalTeardown() {
  console.log(
    "\nRunning global teardown — cleaning up Playwright test data...",
  );

  // ── 1. Obtain admin token ──────────────────────────────────────────────────
  let adminToken: string;
  try {
    const res = await axios.post(`${API}/auth/login`, ADMIN_CREDENTIALS);
    adminToken = res.data?.token || res.data?.data?.token;
    if (!adminToken) throw new Error("No token in login response");
  } catch (err: any) {
    console.error(
      "  ✗ Could not obtain admin token for teardown:",
      err.message,
    );
    console.log("  Skipping teardown — seed admin account may not exist yet.");
    return;
  }

  const client = axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  // ── 2. Fetch all users and filter to test accounts ─────────────────────────
  let testUsers: any[] = [];
  try {
    const res = await client.get("/users");
    const allUsers: any[] = res.data?.data || res.data || [];
    testUsers = allUsers.filter(
      (u: any) =>
        typeof u.email === "string" && u.email.endsWith(TEST_EMAIL_DOMAIN),
    );
  } catch (err: any) {
    console.error("  ✗ Could not fetch users:", err.message);
    return;
  }

  if (testUsers.length === 0) {
    console.log("  ~ No test users found — nothing to clean up.");
    console.log("Global teardown completed\n");
    return;
  }

  const testUserIds = new Set<string>(testUsers.map((u: any) => u.id));
  console.log(`  Found ${testUsers.length} test user(s) to remove`);

  // ── 3. Delete events created by test users ─────────────────────────────────
  let deletedEvents = 0;
  try {
    const eventsRes = await client.get(`/events?numberOfEventsToGet=500`);
    // API may wrap in data.events, data.data, or return array directly
    const raw = eventsRes.data;
    const events: any[] =
      raw?.data?.events ?? raw?.events ?? (Array.isArray(raw) ? raw : []);

    for (const event of events) {
      const creatorId: string | undefined =
        event.createdByUserId ?? event.creatorId ?? event.createdByUser?.id;

      if (creatorId && testUserIds.has(creatorId)) {
        try {
          await client.delete(`/events/remove/${event.id}`);
          deletedEvents++;
        } catch {
          // Already deleted or not found — ignore
        }
      }
    }
  } catch (err: any) {
    console.error("  ✗ Could not fetch/delete events:", err.message);
    // Continue to user deletion even if event cleanup partial
  }

  // ── 4. Delete test users ───────────────────────────────────────────────────
  let deletedUsers = 0;
  for (const user of testUsers) {
    try {
      await client.delete(`/users/remove/${user.id}`);
      deletedUsers++;
    } catch (err: any) {
      console.error(
        `  ✗ Could not delete user "${user.email}":`,
        err.response?.data?.message ?? err.message,
      );
    }
  }

  console.log(
    `  ✓ Removed ${deletedEvents} event(s) and ${deletedUsers}/${testUsers.length} user(s)`,
  );
  console.log("Global teardown completed\n");
}

export default globalTeardown;
