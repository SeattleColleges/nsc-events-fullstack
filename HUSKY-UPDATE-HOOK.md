# Git Hooks Setup After `git pull`

## If you already have this project locally and just ran `git pull origin main`:

### ⚠️ One-Time Cleanup Required

You need to **remove old legacy hooks** that conflict with the new Husky v9 setup:

#### **Mac/Linux:**

```bash
rm -f .git/hooks/pre-commit .git/hooks/pre-push
```

#### **Windows (PowerShell):**

```powershell
Remove-Item .git/hooks/pre-commit, .git/hooks/pre-push -ErrorAction SilentlyContinue
```

#### **Windows (Command Prompt):**

```cmd
del .git\hooks\pre-commit .git\hooks\pre-push
```

**That's it!** After removing the old hooks, the new smart hooks will work automatically.

---

## ✅ How It Works (Husky v9)

### Automatic Setup:

- Git's `core.hooksPath` is configured to `.husky/_/`
- When you run `npm install`, Husky automatically sets up hooks
- No manual copying or activation needed

### What these hooks do:

- **Pre-commit**: Detects staged files and runs linting/compilation ONLY for affected workspace (backend or frontend)
- **Pre-push**: Detects changed files and runs CI checks ONLY for affected workspace (mirrors GitHub workflow logic)

### Verify it's working:

Try making a commit with only backend changes - you should see:

```
🚀 Running pre-commit checks...
📋 Checking staged files...
✅ Backend files detected - running backend checks
Running lint and compile for backend workspace...
```

Or try pushing with only documentation changes:

```
🚀 Running pre-push checks...
📋 Detecting changed files (mirroring GitHub workflow)...
✅ Only documentation or config files changed - skipping all checks
```

---

## ⚠️ IMPORTANT: Do NOT Copy Hooks Manually

**Never run commands like:**

```bash
# ❌ DON'T DO THIS - causes conflicts with Husky v9
cp .husky/pre-commit .git/hooks/pre-commit
```

This creates legacy hooks that override Husky's smart detection and will run redundant checks.

---

## For brand new Project clones:

If you're setting up the project for the first time:

1. Clone the repository
2. Run `npm install`
3. **That's it!** The `prepare` script automatically sets up Husky

The hooks will work immediately with no additional steps needed!
