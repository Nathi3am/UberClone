# Secret scanning setup

This folder contains instructions and helpers to add local pre-commit secret scanning.

Recommended quick setup (local):

1. Install detect-secrets (Python): `pip install detect-secrets`
2. Initialize baseline: `detect-secrets scan > .secrets.baseline`
3. Add a pre-commit entry (see `pre-commit.sample`) or use `pre-commit` framework.

CI: A GitHub Action `.github/workflows/secret-scan.yml` is included to run TruffleHog on pushes/PRs.

Note: This repository also contains `.gitignore` entries to avoid committing common env files.
