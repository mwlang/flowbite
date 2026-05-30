# feat: scope init functions to a DOM subtree

## Closes / relates to

Relates to #796, #1055, #1123 (groundwork for the upcoming `AutoInit` fix)

## Summary

Adds an optional `root: ParentNode = document` parameter to every `initX()` function
and to `initFlowbite()`. Replaces `document.querySelectorAll(...)` at the top of each
loop with `root.querySelectorAll(...)`. ID lookups (`document.getElementById(...)`)
and attribute-foreign-key lookups (`document.querySelector('[data-input-counter-increment="..."]')`)
keep `document` because the referenced elements may live outside `root`.

This is a no-op at every existing call site (`document` is the default), and is
purely groundwork for the follow-up `AutoInit` PR which needs to initialize only the
components inside a newly-added DOM subtree rather than re-scanning the whole page.

## Files changed

- `src/components/index.ts` — `initFlowbite(root: ParentNode = document)` forwards
  the root to each `initX(root)`.
- `src/components/{accordion,carousel,clipboard,collapse,datepicker,dial,dismiss,drawer,dropdown,input-counter,modal,popover,tabs,tooltip}/index.ts` —
  each `initX()` accepts and uses `root`.
- `src/config/global.ts` — `window.initX` and `window.initFlowbite` types
  updated to `(root?: ParentNode) => void`.
- `src/index.ts`, `src/index.umd.ts`, `src/index.turbo.ts`, `src/index.phoenix.ts` —
  the `Events`-based call sites previously passed bare `initX` references. With
  the new optional `root` parameter, TypeScript flags this because the `Event`
  argument would be passed positionally as `root`. Wrapped with arrow thunks
  (`() => initX()`) so the `Event` is discarded — no runtime behavior change since
  these functions already ignored the `Event` arg in practice.

The `Instances` singleton already exposes `getAllInstances()` and
`getInstances(component)` in tree, so no new accessors are introduced here.

## Backward compatibility

No behavior change anywhere. All existing call sites omit the argument and get
`document` by default. `window.initFlowbite` and `window.initX` types remain
single-callable with no required arguments (`(root?: ParentNode) => void`).

The thunk-wrapped event handlers in the `index.*.ts` entry files are a
type-system fix; runtime behavior is unchanged.

## Notes for reviewers

- Most of the diff is **indent reformatting** after collapsing
  `document\n    .querySelectorAll(...)\n    .forEach(...)` to a single line.
  Review with `git diff -w` to see the substantive changes.
- This PR is intentionally small and purely structural. It enables PR 3 (`AutoInit`)
  to scope `MutationObserver`-driven re-inits to the affected subtree. Combined with
  the idempotency guards in PR 1, this gives correct lifecycle behavior with
  O(changes) work per DOM mutation rather than O(document).

## Testing

- `tsc --noEmit` clean.
- `eslint src/` 0 errors (6 pre-existing warnings unrelated to this PR).
- `npm run build:lib` produces CJS + ESM cleanly.
- Each `initX(specificSubtree)` initializes only components inside `specificSubtree`,
  leaving components elsewhere in the document untouched.
- `initFlowbite(specificSubtree)` propagates the scope through to each `initX`.
