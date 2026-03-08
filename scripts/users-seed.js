/**
 * Seed script — populates the local database with sample user profiles.
 *
 * Usage (from repo root):
 *   npm run seed:users
 *
 * Requires the NestJS backend to be running on port 3000.
 * Each user is registered via POST /auth/signup. Already-existing accounts
 * (HTTP 409) are skipped rather than treated as errors.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const axios = require("axios");

const API = process.env.PLAYWRIGHT_API_URL || "http://localhost:3000/api";

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
    lastName: "Account",
    pronouns: "they/them",
    role: "admin",
  },
  {
    email: "user@nsc.dev",
    password: "user@user123",
    firstName: "User",
    lastName: "Account",
    pronouns: "they/them",
    role: "user",
  },
  {
    email: "user2@nsc.dev",
    password: "user2@user123",
    firstName: "User",
    lastName: "Two",
    pronouns: "she/her",
    role: "user",
  },
  {
    email: "creator2@nsc.dev",
    password: "creator2@creator123",
    firstName: "Creator",
    lastName: "Two",
    pronouns: "he/him",
    role: "creator",
  }
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`\nSeeding users against ${API}\n`);

  let created = 0;
  let skipped = 0;

  for (const user of SEED_USERS) {
    try {
      await axios.post(`${API}/auth/signup`, user);
      console.log(`  ✓ Created "${user.email}" (role: ${user.role})`);
      created++;
    } catch (err) {
      if (err.response?.status === 409) {
        console.log(`  ~ Skipped "${user.email}" — already exists`);
        skipped++;
      } else {
        const msg = err.response?.data?.message ?? err.message;
        console.error(`  ✗ "${user.email}" — ${JSON.stringify(msg)}`);
      }
    }
  }

  console.log(
    `\nDone — ${created} created, ${skipped} skipped, ${SEED_USERS.length - created - skipped} failed.\n`
  );
}

seed();
