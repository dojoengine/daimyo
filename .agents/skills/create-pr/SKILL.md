---
name: create-pr
description: Create or update a PR from current branch to main and address feedback
---
The user likes the state of the code.

There are $`git status --porcelain | wc -l | tr -d ' '` uncommitted changes.
The current branch is $`git branch --show-current`.
The target branch is origin/main.

$`git rev-parse --abbrev-ref @{upstream} 2>/dev/null && echo "Upstream branch exists." || echo "There is no upstream branch yet."`

**Existing PR:** $`gh pr view --json number,title,url --jq '"#\(.number): \(.title) - \(.url)"' 2>/dev/null || echo "None"`

The user requested a PR.

Follow these exact steps:

## Phase 1: Review the code

1. Review test coverage
2. Check for silent failures
3. Verify code comments are accurate
4. Review any new types
5. General code review

## Phase 2: Create/Update PR

6. Run `git diff` to review uncommitted changes
7. Commit them. Follow any instructions the user gave you about writing commit messages.
8. Push to origin.
9. Use `git diff origin/main...` to review the full PR diff
10. Check if a PR already exists for this branch:
   - **If PR exists**:
     - Draft/update the description in a temp file (e.g. `/tmp/pr-body.txt`).
     - Update the PR body using the non-deprecated script:
       - `./.agents/skills/create-pr/scripts/pr-body-update.sh --file /tmp/pr-body.txt`
     - Re-fetch the body with `gh pr view --json body --jq .body` to confirm it changed.
   - **If no PR exists**: Use `gh pr create --base main` to create a new PR. Keep the title under 80 characters and the description under five sentences.

The PR description should summarize ALL commits in the PR, not just the latest changes.

## Phase 3: Completion

11. Report the PR URL to the user. Do not poll for CI status — the user monitors CI externally.

12. If the user reports CI failures or review feedback, address them:
    - Fix issues, commit, and push
    - For bot reviews, address clearly actionable comments (bug fixes, typos, simple improvements)
    - Skip comments that require design decisions or user input

13. If the user asks to merge:
    - Use `gh pr merge --squash --delete-branch` to squash-merge and delete the remote branch
    - Check if we're in a git worktree: `[ "$(git rev-parse --git-common-dir)" != "$(git rev-parse --git-dir)" ]`
    - **If in a worktree**: Ask if they want to clean up the worktree. If yes, run `wt remove --yes --force`.
    - **If not in a worktree**: `git checkout main && git pull`

If any step fails in a way you cannot resolve, ask the user for help.
