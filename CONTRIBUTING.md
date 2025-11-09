# Contributing to NSC Events Fullstack

Thank you for contributing to the NSC Events Fullstack project! This document provides guidelines and information to help you contribute effectively.

## Table of Contents

- [Development Workflow](#development-workflow)
- [Git Hooks (Husky)](#git-hooks-husky)
- [GitHub CI/CD Workflows](#github-cicd-workflows)
- [Keeping Husky and GitHub Workflows in Sync](#keeping-husky-and-github-workflows-in-sync)
- [Code Quality Standards](#code-quality-standards)
- [Testing Guidelines](#testing-guidelines)
- [Bypassing Git Hooks](#bypassing-git-hooks)

---

## Development Workflow

This is a monorepo project with two main workspaces:
- **nsc-events-nextjs** - Frontend (Next.js)
- **nsc-events-nestjs** - Backend (NestJS)

### Available Scripts

From the root directory:

```bash
# Development
npm run dev:frontend       # Run frontend only
npm run dev:backend        # Run backend only

# Building
npm run build              # Build both frontend and backend
npm run build:frontend     # Build frontend only
npm run build:backend      # Build backend only

# Testing
npm run test               # Run all tests
npm run test:frontend      # Run frontend tests
npm run test:backend       # Run backend tests
npm run test:coverage      # Run tests with coverage

# Code Quality
npm run lint               # Lint all code
npm run lint:frontend      # Lint frontend code
npm run lint:backend       # Lint backend code
npm run compile            # TypeScript compilation check
```

---

## Git Hooks (Husky)

This project uses [Husky](https://typicode.github.io/husky/) to enforce code quality through Git hooks. These hooks run automatically during Git operations to catch issues **before** they reach the remote repository.

### Pre-Commit Hook (`.husky/pre-commit`)

**When it runs:** Before every `git commit`

**What it does:**
1. **Lint Staged Files** - Runs linter only on files you're committing (via `lint-staged`)
2. **TypeScript Compilation** - Checks that TypeScript compiles without errors

**Purpose:** Quick validation to ensure committed code is properly formatted and compiles.

**Configuration:** 
- Hook script: `.husky/pre-commit`
- Lint-staged config: `.lintstagedrc.json`

### Pre-Push Hook (`.husky/pre-push`)

**When it runs:** Before every `git push`

**What it does (5 steps):**
1. **Linting** - Lint all code in both workspaces
2. **TypeScript Compilation** - Compile TypeScript in both workspaces
3. **Test Coverage** - Run full test suite with coverage
4. **Build** - Build both frontend and backend
5. **Final Validation** - Confirm all checks passed

**Purpose:** Simulate the complete GitHub CI pipeline locally before pushing code to the remote repository. This saves time by catching issues locally instead of waiting for CI to fail.

---

## GitHub CI/CD Workflows

The project has multiple GitHub Actions workflows that run automatically on specific triggers:

### 1. Frontend CI (`.github/workflows/frontend-ci.yml`)

**Triggers:**
- Push to `main` branch (only if `nsc-events-nextjs/**` files change)
- Pull requests (only if `nsc-events-nextjs/**` files change)

**Steps:**
1. Clean install dependencies
2. Run linter
3. Compile TypeScript
4. Run Jest unit tests
5. Run test coverage
6. Build application
7. Archive build artifacts (retained for 14 days)

### 2. Backend CI (`.github/workflows/backend-ci.yml`)

**Triggers:**
- Push to `main` branch (only if `nsc-events-nestjs/**` files change)
- Pull requests (only if `nsc-events-nestjs/**` files change)

**Steps:**
1. Clean install dependencies
2. Run linter
3. Compile TypeScript
4. Run test coverage
5. Build application
6. Archive build artifacts (retained for 14 days)
7. Archive code coverage report (retained for 14 days)

### 3. Monorepo CI on Pull Request (`.github/workflows/on-pull-request.yml`)

**Triggers:**
- Pull requests (opened, synchronize, reopened)

**Features:**
- Detects which workspace changed (frontend/backend)
- Runs CI only for changed workspaces (efficient!)
- Separate jobs for frontend and backend

---

## Keeping Husky and GitHub Workflows in Sync

**⚠️ CRITICAL: Husky hooks MUST stay synchronized with GitHub workflows!**

### Why Synchronization Matters

The pre-push hook is designed to **replicate the GitHub CI pipeline locally**. This ensures:
- ✅ Issues are caught before pushing (faster feedback)
- ✅ CI failures are prevented (saves CI resources)
- ✅ Consistent experience between local and remote environments
- ✅ Confidence that if pre-push passes, CI will pass

### Current Synchronization Map

| GitHub Workflow Step | Pre-Push Hook Step | Pre-Commit Hook |
|---------------------|-------------------|-----------------|
| Run linter | ✅ Step 1/5: Linting | ✅ Lint staged only |
| Compile TypeScript | ✅ Step 2/5: Compilation | ✅ TypeScript compile |
| Test coverage | ✅ Step 3/5: Test coverage | ❌ Not included |
| Build application | ✅ Step 4/5: Build | ❌ Not included |

### When to Update Husky Hooks

**You MUST update Husky hooks when:**

1. **Adding a new CI step** in GitHub workflows
   - Add corresponding step to `.husky/pre-push`
   - Update step numbers (Step X/Y format)
   
2. **Removing a CI step** from GitHub workflows
   - Remove corresponding step from `.husky/pre-push`
   - Update step numbers
   
3. **Changing the order** of CI steps
   - Reorder steps in `.husky/pre-push` to match
   
4. **Modifying CI commands** (e.g., adding flags)
   - Update commands in `.husky/pre-push` to match exactly
   
5. **Adding new npm scripts** used in CI
   - Ensure they're available in `package.json`

### How to Update Husky Hooks

**Example: Adding a new "Security Scan" step to CI**

1. **Update GitHub workflow** (e.g., `.github/workflows/frontend-ci.yml`):
```yaml
- name: Security audit
  run: npm audit --audit-level=moderate
  working-directory: ./nsc-events-nextjs
```

2. **Update `.husky/pre-push`**:
```bash
# Step 5/6: Security audit (matches GitHub workflow step)
echo "Step 5/6: Running security audit..."
npm run audit

if [ $? -ne 0 ]; then
  echo "Security audit failed! Push blocked."
  exit 1
fi
```

3. **Update step numbers** throughout the file (was 5 steps, now 6 steps)

4. **Test locally**:
```bash
git commit -m "test"
git push  # Should run new security audit step
```

### Verification Checklist

Before merging changes that modify CI or hooks:

- [ ] All GitHub workflow steps have corresponding pre-push steps
- [ ] Step order matches between CI and pre-push
- [ ] Commands are identical (except workspace-specific paths)
- [ ] Step numbers are accurate (X/Y format)
- [ ] Error messages are clear and helpful
- [ ] Tested locally by running `git push`
- [ ] Documentation updated (this file!)

---

## Code Quality Standards

### Linting

- **Frontend:** ESLint with Next.js configuration
- **Backend:** ESLint with NestJS configuration
- **Auto-fix:** Use `npm run lint -- --fix` to automatically fix issues

### TypeScript

- Strict mode enabled
- All code must compile without errors
- Type safety is enforced (no `any` without justification)

### Testing

- **Frontend:** Jest + React Testing Library
- **Backend:** Jest with NestJS testing utilities
- Minimum coverage requirements enforced in CI

---

## Testing Guidelines

### Running Tests

```bash
# Run all tests
npm run test

# Run tests for specific workspace
npm run test:frontend
npm run test:backend

# Run with coverage
npm run test:coverage
```

### Writing Tests

- Write tests for all new features
- Maintain or improve code coverage
- Follow existing test patterns in the codebase
- Use descriptive test names

---

## Bypassing Git Hooks

**⚠️ Use with extreme caution!**

If you absolutely need to bypass hooks (e.g., WIP commits):

```bash
# Bypass pre-commit hook
git commit --no-verify -m "WIP: work in progress"

# Bypass pre-push hook
git push --no-verify
```

**When it's acceptable:**
- Creating WIP commits on a feature branch
- Emergency hotfixes (with team notification)
- Known false positives (document why)

**When it's NOT acceptable:**
- Merging to main branch
- Creating pull requests
- Regular development workflow
- To avoid fixing legitimate issues

---

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all local hooks pass
4. Push your branch (pre-push hook will validate)
5. Create a pull request
6. Wait for CI to pass (it should, since pre-push passed!)
7. Request code review
8. Address feedback
9. Merge once approved and CI passes

---

## Getting Help

- **Issues:** Check existing issues or create a new one
- **Discussions:** Use GitHub Discussions for questions
- **Documentation:** See README.md for project setup

---

## Summary for Maintainers

**Golden Rule:** The pre-push hook should always mirror the GitHub CI pipeline exactly.

**When modifying CI workflows:**
1. Update GitHub workflow file
2. Update `.husky/pre-push` to match
3. Test both locally (git push) and remotely (create PR)
4. Update this CONTRIBUTING.md file
5. Notify team of changes

**Pre-commit vs Pre-push:**
- **Pre-commit:** Fast, minimal checks (lint staged, compile)
- **Pre-push:** Complete CI simulation (lint all, compile, test, build)

This approach ensures developers get immediate feedback while maintaining high code quality standards.
