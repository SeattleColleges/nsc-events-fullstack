/**
 * Seed script — populates the local database with sample user profiles.
 *
 * Usage (from repo root):
 *   npm run seed:users
 *
 * Requires the NestJS backend to be running on port 3000.
 * New accounts are created via POST /auth/signup. If the email is already in
 * use (HTTP 409) the existing account is updated via PATCH /users/update/:id
 * using an admin token.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const axios = require("axios");

const API = process.env.PLAYWRIGHT_API_URL || "http://localhost:3000/api";

// The admin entry in SEED_USERS is used to obtain a token for update calls.
const ADMIN = { email: "admin@nsc.dev", password: "admin@admin123" };

// ─── User templates ──────────────────────────────────────────────────────────

const SEED_USERS = [
  {
    email: "seed-creator@nsc.dev",
    password: "Seed@Creator123",
    firstName: "Seed",
    lastName: "Creator",
    pronouns: "they/them",
    role: "creator",
  },
  {
    email: "admin@nsc.dev",
    password: "admin@admin123",
    firstName: "Admin",
    lastName: "TestAccount",
    pronouns: "they/them",
    role: "admin",
  },
  {
    email: "admin2@nsc.dev",
    password: "Admin2@dev456",
    firstName: "Admin2",
    lastName: "TestAccount",
    pronouns: "they/them",
    role: "admin",
  },
  {
    email: "user@nsc.dev",
    password: "user@user123",
    firstName: "User",
    lastName: "TestAccount",
    pronouns: "they/them",
    role: "user",
  },
  {
    email: "user2@nsc.dev",
    password: "user@user123",
    firstName: "User",
    lastName: "TestAccount",
    pronouns: "she/her",
    role: "user",
  },
  {
    email: "user3@nsc.dev",
    password: "user@user123",
    firstName: "User3",
    lastName: "TestAccount",
    pronouns: "they/them",
    role: "user",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAdminToken() {
  // Try logging in first
  try {
    const res = await axios.post(`${API}/auth/login`, ADMIN);
    const token = res.data?.token || res.data?.data?.token;
    if (token) return token;
  } catch {
    // Admin doesn't exist yet — will be created in the main loop
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`\nSeeding users against ${API}\n`);

  // Ensure admin exists before processing the full list so we have a token
  // for any update calls that follow.
  for (const user of SEED_USERS) {
    if (user.email === ADMIN.email) {
      try {
        await axios.post(`${API}/auth/signup`, user);
        console.log(`  ✓ Created "${user.email}" (role: ${user.role})`);
      } catch {
        // Signup failed — admin may already exist; getAdminToken() will login below.
        console.log(
          `  ~ Admin "${user.email}" already exists, skipping signup`,
        );
      }
      break;
    }
  }

  const adminToken = await getAdminToken();
  if (!adminToken) {
    console.error("  ✗ Could not obtain admin token — aborting.");
    process.exit(1);
  }

  const client = axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const user of SEED_USERS) {
    if (user.email === ADMIN.email) continue; // already handled above

    try {
      await axios.post(`${API}/auth/signup`, user);
      console.log(`  ✓ Created "${user.email}" (role: ${user.role})`);
      created++;
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message ?? err.message ?? "";
      const alreadyExists =
        status === 409 || message.toLowerCase().includes("already exists");

      if (alreadyExists) {
        // User exists — look up by email then patch
        try {
          const found = await client.get(
            `/users/email/${encodeURIComponent(user.email)}`,
          );
          const id = found.data?.id || found.data?.data?.id;
          await client.patch(`/users/update/${id}`, {
            firstName: user.firstName,
            lastName: user.lastName,
            pronouns: user.pronouns,
            role: user.role,
          });
          console.log(`  ↻ Updated "${user.email}" (role: ${user.role})`);
          updated++;
        } catch (updateErr) {
          const msg = updateErr.response?.data?.message ?? updateErr.message;
          console.error(
            `  ✗ "${user.email}" update failed — ${JSON.stringify(msg)}`,
          );
          failed++;
        }
      } else {
        console.error(`  ✗ "${user.email}" — ${JSON.stringify(message)}`);
        failed++;
      }
    }
  }

  console.log(
    `\nDone — ${created} created, ${updated} updated, ${failed} failed.\n`,
  );
}

seed();
