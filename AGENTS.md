# AGENTS.md

Repository rules for all coding agents:

## General Behavior
1. Always present:
   - A short plan (bullet points).
   - Then a clear file-by-file diff before applying changes.
2. Prefer minimal diffs. Do not refactor or restructure unless explicitly requested.
3. Do not modify unrelated files.

## Environment Safety
4. Never read, modify, stage, or commit `.env.local`.
5. Never log or expose environment variables.
6. Do not change Vercel environment settings.

## Build Safety
7. Run `npm run build` before any push.
8. If the build fails, fix the issue before committing.
9. Do not push if the build is red.

## Git Workflow
10. Default workflow:
    - Create and use a feature branch (never work directly on `main` unless explicitly requested).
    - Use clear, scoped commit messages (Conventional Commit style preferred).
    - Example: `feat(ai): add palette validation logic`

11. After changes:
    - Show `git status`
    - Show commit summary
    - Confirm push target branch

## Code Quality
12. Keep UI consistent with existing Tailwind patterns.
13. Avoid introducing new dependencies unless explicitly approved.
14. Keep API routes simple and server-safe (no client secrets).
