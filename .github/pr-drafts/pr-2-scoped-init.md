# feat: scope init functions to a DOM subtree

## Closes / relates to

Relates to #796, #1055, #1123 (groundwork for the upcoming `AutoInit` fix)

## Summary

Adds an optional `root: ParentNode = document` parameter to every `initX()` function
and to `initFlowbite()`. Replaces `document.querySelectorAll(...)` with
`root.querySelectorAll(...)` inside each loop.

This is a no-op at every existing call site (`document` is the default), and is
purely groundwork for the follow-up `AutoInit` PR which needs to initialize only
the components inside a newly-added DOM subtree rather than re-scanning the whole
page.

## Files changed

- `src/components/index.ts` — `initFlowbite(root: ParentNode = document)` forwards
  the root to each `initX(root)`.
- `src/components/{accordion,carousel,clipboard,collapse,datepicker,dial,dismiss,drawer,dropdown,input-counter,modal,popover,tabs,tooltip}/index.ts` —
  each `initX()` accepts and uses `root`.

## Backward compatibility

No behavior change anywhere. All existing call sites omit the argument and get
`document` by default. `window.initFlowbite` and `window.initX` types remain
single-callable with no required arguments.

## Testing

- Verified each `initX(specificSubtree)` initializes only components inside
  `specificSubtree`, leaving components elsewhere in the document untouched.
- `initFlowbite(specificSubtree)` propagates the scope through to each `initX`.

## Notes for reviewers

This PR is intentionally small and purely structural. It enables PR 3 (`AutoInit`)
to scope `MutationObserver`-driven re-inits to the affected subtree. Combined with
the idempotency guards in PR 1, this gives correct lifecycle behavior with O(changes)
work per DOM mutation rather than O(document).
