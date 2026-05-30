# PR drafts (housekeeping)

This directory holds upstream-ready PR descriptions for the three-PR
Hotwire/Stimulus modernization series. They live on the
`feat/hotwire-stimulus-modernization` integration branch only — not on
the individual PR branches — so they don't pollute the diffs that go to
`themesberg/flowbite`.

## Branch topology

```
upstream/main (themesberg/flowbite)
   │
origin/main (mwlang/flowbite)
   │
   └─ feat/hotwire-stimulus-modernization  ← INTEGRATION (pin target for Rails apps)
        │
        ├─ fix/idempotent-init      ← PR 1 → targets feat/hotwire-stimulus-modernization
        ├─ feat/scoped-init         ← PR 2 → branches off PR 1; targets integration
        └─ feat/auto-init           ← PR 3 → branches off PR 2; targets integration
```

## Workflow

1. Work happens on the PR branches (`fix/idempotent-init` etc.).
2. PRs open on the fork target `feat/hotwire-stimulus-modernization`, not
   `main`, so the integration branch accumulates all three layers and can
   be pinned by downstream Rails apps.
3. When a PR is ready to offer upstream:
   - Rebase the PR branch onto `upstream/main` (or `origin/main` if it
     tracks upstream).
   - Open the upstream PR with the body copied verbatim from the
     corresponding file in this directory.
4. If upstream merges a PR, rebase the next PR in the chain onto
   `upstream/main` to drop now-redundant commits.

## Files

- `796-comment-archive.md` — the architectural-proposal comment posted on
  themesberg/flowbite#796 on 2026-05-30. Kept here for reference; the
  posted version is at https://github.com/themesberg/flowbite/issues/796#issuecomment-4583458690
- `pr-1-idempotent-init.md` — PR 1 description (idempotency guards).
- `pr-2-scoped-init.md` — PR 2 description (`root` parameter + scoped init).
- `pr-3-auto-init.md` — PR 3 description (`AutoInit` + `index.turbo.ts` rewrite).
