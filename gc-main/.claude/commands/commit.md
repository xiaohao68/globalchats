# Commit

Generate a standardized commit message based on git status.

## Steps

1. Run `git status` to view all untracked and modified files
2. Run `git diff` to view the specific code changes
3. Generate a standardized commit message based on the changes
4. **Must commit all uncommitted changes** - do not leave out any files
5. **Can split into multiple commits by functional area** - if changes involve multiple independent features, split them into separate commits

## Commit Convention

- **First line should not exceed 50 characters**
- **Use Chinese to describe "what was done" rather than "what was changed"**
- Format: `<type>(<scope>): <title>`

### Type Reference

| Type | Description |
|------|-------------|
| feat | New feature |
| fix | Bug fix |
| docs | Documentation update |
| style | Code formatting |
| refactor | Refactoring |
| perf | Performance optimization |
| test | Test related |
| chore | Build/tools |

### Example

```
feat(auth): add user login functionality

- Support email and phone number login
- Integrate JWT token
- Add login logging
```

## Pre-commit Checks

1. Run `pnpm lint` to check code style
2. Run `pnpm test` to ensure tests pass
3. Ensure no sensitive information is committed (passwords, keys, etc.)
4. Ensure no build artifacts are committed (node_modules, dist)

## Execute Commit

After generating the commit message, execute directly without asking for confirmation:

```bash
git add <files>
git commit -m "<commit message>"
```
