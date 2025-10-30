# Git Hooks Setup After `git pull`

## If you already have this project locally and just ran `git pull origin main`:

You now have new Git hooks in your project, but they need to be activated with a **one-time setup**.

### What happened when you pulled:
You received new `.husky/pre-commit` and `.husky/pre-push` hook files  
But Git hooks are **not automatically active** until you copy them to the right location

### One-time activation (choose your platform):

#### **Mac/Linux:**
```bash
cp .husky/pre-commit .git/hooks/pre-commit
cp .husky/pre-push .git/hooks/pre-push  
chmod +x .git/hooks/pre-commit .git/hooks/pre-push
```

#### **Windows Command Prompt:**
```cmd
copy /Y ".husky\pre-commit" ".git\hooks\pre-commit"
copy /Y ".husky\pre-push" ".git\hooks\pre-push"
```

### What these hooks do:
- **Pre-commit**: Runs linting and TypeScript compilation before each commit
- **Pre-push**: Runs full test suite before each push

### Verify it's working:
After running the commands above, try making a commit - you should see:
```
Running pre-commit checks...
Checking staged files for linting issues...
Compiling TypeScript...
All pre-commit checks passed!
```

---

## For brand new Project clones:
If you're setting up the project for the first time or choose to clone a fresh one, the hooks are automatically installed when you run:
- `bash ./setup-macos-linux.sh` (Mac/Linux)  
- `./setup-windows.bat` (Windows)

No additional steps needed for fresh setups!