# NSC EVENTS Fullstack

This is a monorepo containing both the frontend (Next.js) and backend (Nest.js) applications for NSC EVENTS.

## Project Structure

- `nsc-events-nextjs`: Frontend application built with Next.js
- `nsc-events-nestjs`: Backend API built with Nest.js

## Getting Started

### Prerequisites

- Node.js 22.x
- npm

### Installation

```bash
# Clone the repository
git clone 
cd nsc-events-fullstack

# Install dependencies for both projects
npm install
```

### Development

To run both applications in development mode:

```bash
# Run both frontend and backend
npm run dev

# Run only frontend
npm run dev:frontend

# Run only backend
npm run dev:backend
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
