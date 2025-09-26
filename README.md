# NSC EVENTS Fullstack - PostgreSQL Migration

This is a monorepo containing both the frontend (Next.js) and backend (Nest.js) applications for NSC EVENTS, fully migrated from MongoDB to PostgreSQL.

## Project Structure

- `nsc-events-nextjs`: Frontend application built with Next.js
- `nsc-events-nestjs`: Backend API built with Nest.js + PostgreSQL + TypeORM

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm
- PostgreSQL 14 or higher
- pgAdmin

### Installation

To get started, you can use the automated setup script for your operating system.

#### For macOS and Linux users:

```bash
# Clone the repository
git clone https://github.com/SeattleColleges/nsc-events-fullstack
cd nsc-events-fullstack

# Run the setup script
bash setup.sh
```

#### For Windows users:

```bash
# Clone the repository
git clone https://github.com/SeattleColleges/nsc-events-fullstack
cd nsc-events-fullstack

# Run the setup script
setup.bat
```

After running the script, you will need to:

1.  **Configure the backend `.env` file** in `nsc-events-nestjs/.env` with your PostgreSQL credentials.
2.  **Create a PostgreSQL database** named `nsc_events`.

Alternatively, you can follow the manual installation steps below.

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/SeattleColleges/nsc-events-fullstack
cd nsc-events-fullstack

# Install PostgreSQL and remember your password

# Set up the backend
cd nsc-events-nestjs
cp .env.example .env
# Edit .env and update your PostgreSQL password
npm install

# Set up the frontend
cd ../nsc-events-nextjs
cp .env.example .env.local
# Update .env.local if needed
npm install
```

### Database Setup

1. Create a PostgreSQL database named `nsc_events`
2. Update the `.env` file in `nsc-events-nestjs` with your PostgreSQL credentials
3. The database tables will be automatically created when you start the backend

### Running the Applications

**Backend:**

```bash
cd nsc-events-nestjs
npm run start:dev
```

**Frontend:**

```bash
cd nsc-events-nextjs
npm run dev
```

Example `.env` configuration:

```
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DATABASE=nsc_events
TYPEORM_SYNCHRONIZE=true
```

### Building

```bash
# Build both applications
npm run build

# Build only frontend
npm run build:frontend

# Build only backend
npm run build:backend
```

### Testing

```bash
# Test both applications
npm run test

# Test only frontend
npm run test:frontend

# Test only backend
npm run test:backend
```

## CI/CD

This repository uses GitHub Actions for continuous integration. The workflow files are located in the `.github/workflows` directory:

- `frontend-ci.yml`: CI workflow for the Next.js application
- `backend-ci.yml`: CI workflow for the Nest.js application
- `on-pull-request.yml`: Workflow that runs when a PR is opened or updated
- `on-new-issue.yml`: Workflow that runs when a new issue is created

## License

See the LICENSE files in each project directory for details.
