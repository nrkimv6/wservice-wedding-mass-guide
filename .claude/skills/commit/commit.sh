#!/bin/bash
set -e

MESSAGE="$1"

if [ -z "$MESSAGE" ]; then
    echo "[!] Usage: $0 \"commit message\""
    exit 1
fi

# Set git user config (for mobile/Linux environments without global config)
git config user.name "nrkimv6"
git config user.email "risingnrkim@outlook.kr"

# Check if there are staged changes
STAGED=$(git diff --cached --name-only)
if [ -z "$STAGED" ]; then
    echo "[!] No staged changes to commit. Use 'git add' first."
    echo ""
    echo "[*] Unstaged changes:"
    git status --short
    exit 1
fi

# Show staged changes
echo ""
echo "[*] Staged changes:"
git diff --cached --name-status

# Commit
echo ""
echo "[*] Committing..."
git commit -m "$MESSAGE"

if [ $? -eq 0 ]; then
    echo ""
    echo "[+] Commit successful!"
    echo ""
    echo "[*] Commit info:"
    git log -1 --oneline
else
    echo ""
    echo "[-] Commit failed!"
    exit 1
fi
