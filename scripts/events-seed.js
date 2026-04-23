/**
 * Seed script — populates the local database with sample events.
 *
 * Usage (from repo root):
 *   npm run seed
 *
 * Requires the NestJS backend to be running on port 3000.
 * A seed creator account is created (or reused if it already exists).
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const axios = require("axios");

const API = process.env.PLAYWRIGHT_API_URL || "http://localhost:3000/api";

const SEED_USER = {
  email: "seed-creator@nsc.dev",
  password: "Seed@Creator123",
  firstName: "Seed",
  lastName: "Creator",
  pronouns: "they/them",
  role: "creator",
};

// ─── Event templates ──────────────────────────────────────────────────────────

const today = new Date();
function d(daysOffset, hour = 9) {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + daysOffset);
  dt.setHours(hour, 0, 0, 0);
  return dt.toISOString();
}

const EVENTS = [
  {
    eventTitle: "Web Dev Workshop: Next.js 15 Deep Dive",
    eventDescription:
      "An in-depth hands-on workshop covering the latest features in Next.js 15, including server actions, partial pre-rendering, and the new caching model.",
    startDate: d(3, 10),
    endDate: d(3, 13),
    eventLocation: "Building A, Room 201",
    eventHost: "NSC Web Dev Club",
    eventCapacity: "40",
    eventContact: "webdev@nsc.dev",
    tagNames: ["Tech", "Workshop", "Web"],
    eventPrivacy: "Public",
    eventSchedule: "10:00 AM – Intro\n11:00 AM – Hands-on Lab\n12:00 PM – Q&A",
    eventSpeakers: ["Jane Smith"],
    isHidden: false,
    isArchived: false,
  },
  {
    eventTitle: "Cloud & AWS Study Group – S3 & IAM",
    eventDescription:
      "Study group focused on AWS fundamentals: S3 bucket policies, IAM roles, and access points. Bring your laptop.",
    startDate: d(5, 14),
    endDate: d(5, 16),
    eventLocation: "Library, Study Room 4",
    eventHost: "NSC Cloud Club",
    eventCapacity: "20",
    eventContact: "cloud@nsc.dev",
    tagNames: ["AWS", "Cloud", "Study Group"],
    eventPrivacy: "Public",
    isHidden: false,
    isArchived: false,
  },
  {
    eventTitle: "Spring Career Fair 2026",
    eventDescription:
      "Meet recruiters from 30+ tech companies. Bring printed résumés. Business casual dress required.",
    startDate: d(10, 9),
    endDate: d(10, 17),
    eventLocation: "Main Campus Gymnasium",
    eventHost: "NSC Career Services",
    eventCapacity: "300",
    eventContact: "careers@nsc.dev",
    tagNames: ["Career", "Networking"],
    eventPrivacy: "Public",
    isHidden: false,
    isArchived: false,
  },
  {
    eventTitle: "Hackathon: Build for Good",
    eventDescription:
      "24-hour hackathon with prizes. Build a project that addresses a real community need. Teams of 2–4.",
    startDate: d(14, 8),
    endDate: d(15, 8),
    eventLocation: "Innovation Hub, Floor 3",
    eventHost: "NSC ACM Chapter",
    eventCapacity: "80",
    eventContact: "acm@nsc.dev",
    tagNames: ["Hackathon", "Tech", "Community"],
    eventPrivacy: "Public",
    eventSchedule:
      "Day 1 08:00 – Kickoff\nDay 2 08:00 – Presentations\nDay 2 10:00 – Awards",
    isHidden: false,
    isArchived: false,
  },
  {
    eventTitle: "Intro to Machine Learning",
    eventDescription:
      "Beginner-friendly seminar covering supervised vs. unsupervised learning, common algorithms, and a live Python demo.",
    startDate: d(7, 15),
    endDate: d(7, 17),
    eventLocation: "Science Hall, Room 110",
    eventHost: "NSC AI Club",
    eventCapacity: "60",
    eventContact: "ai@nsc.dev",
    tagNames: ["AI", "Python", "Workshop"],
    eventPrivacy: "Public",
    eventSpeakers: ["Dr. Alice Chen", "Bob Tanaka"],
    isHidden: false,
    isArchived: false,
  },
  {
    eventTitle: "Open Source Contribution Day",
    eventDescription:
      "Find a project, open a PR, get mentored. All skill levels welcome. Coffee and snacks provided.",
    startDate: d(21, 10),
    endDate: d(21, 14),
    eventLocation: "CS Building, Open Lab",
    eventHost: "NSC Open Source Club",
    eventCapacity: "50",
    eventContact: "opensource@nsc.dev",
    tagNames: ["Open Source", "Git", "Community"],
    eventPrivacy: "Public",
    isHidden: false,
    isArchived: false,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getToken() {
  // Try existing seed account first
  try {
    const res = await axios.post(`${API}/auth/login`, {
      email: SEED_USER.email,
      password: SEED_USER.password,
    });
    const token = res.data?.token || res.data?.data?.token;
    if (token) {
      console.log("✓ Logged in as existing seed user");
      return token;
    }
  } catch {
    // User doesn't exist yet — sign up below
  }

  const res = await axios.post(`${API}/auth/signup`, SEED_USER);
  const token = res.data?.token || res.data?.data?.token;
  if (!token) throw new Error("Signup succeeded but no token returned");
  console.log("✓ Created seed user and logged in");
  return token;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`\nSeeding events against ${API}\n`);

  let token;
  try {
    token = await getToken();
  } catch (err) {
    console.error("✗ Auth failed:", err.response?.data ?? err.message);
    process.exit(1);
  }

  const client = axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${token}` },
  });

  let created = 0;
  for (const event of EVENTS) {
    try {
      const res = await client.post("/events/new", event);
      const id = res.data?.id || res.data?.data?.id;
      console.log(`  ✓ "${event.eventTitle}" (id: ${id})`);
      created++;
    } catch (err) {
      const msg = err.response?.data?.message ?? err.message;
      console.error(`  ✗ "${event.eventTitle}" — ${JSON.stringify(msg)}`);
    }
  }

  console.log(`\nDone — ${created}/${EVENTS.length} events created.\n`);
}

seed();
