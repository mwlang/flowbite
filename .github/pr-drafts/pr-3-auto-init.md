# feat: AutoInit replaces event-based Turbo strategy with MutationObserver

## Closes / relates to

Closes #796, #1042, #1055, #998, #1102, #1111, #1123, #986, #1051

## Summary

The current `index.turbo.ts` attaches four event listeners
(`turbo:load`, `turbo:frame-load`, `turbo:render`, `turbo:after-stream-render`) and
calls full-page `initFlowbite()` on each. This has two problems documented in #796
and the related issues:

1. **Over-initialization.** Every event re-scans the whole document and recreates
   components even when nothing relevant changed.
2. **Under-initialization.** DOM injected outside Turbo's lifecycle (e.g., Turbo
   Morph element replacements, third-party frameworks, ad hoc `innerHTML`) is never
   picked up.

This PR introduces a single `MutationObserver`-based lifecycle manager that observes
`document.body` for `childList` mutations and:

- On **removed nodes**: walks the subtree, looks up registered component instances
  whose `_targetEl` is contained in the removed node, calls
  `destroyAndRemoveInstance()`.
- On **added nodes**: calls `initFlowbite(node)` on each Element added.

Tear-down runs before init, so Turbo Morph and other replace-style mutations
(remove old node + add new node in the same observation batch) handle cleanly.

`src/index.turbo.ts` becomes:

```typescript
import { initFlowbite } from './components/index';
import { startAutoInit } from './dom/auto-init';

const start = () => {
    initFlowbite();
    startAutoInit(document.body);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
    start();
}
```

The four Turbo event listeners are removed. The same `AutoInit` mechanism transparently
handles Turbo Drive, Frame, Stream, Morph — plus any other framework or vanilla code
that mutates the DOM. No framework-specific code lives in Flowbite.

## Files changed

- `src/dom/auto-init.ts` (new) — `startAutoInit(root: ParentNode = document.body)`,
  `stopAutoInit()`. Idempotent. Uses `instances.getAllInstances()` (already public)
  to enumerate components for teardown without reaching into private state.
- `src/index.turbo.ts` — replaces the four `new Events(...)` listeners with a single
  `startAutoInit(document.body)` call after initial `initFlowbite()`.

## Backward compatibility

**Behavior change for `flowbite.turbo.js` consumers.** The four event listeners
(`turbo:load`, `turbo:frame-load`, `turbo:render`, `turbo:after-stream-render`) are
removed. Apps that depend on those listeners firing other side effects via
synthetic `Events` will need to attach their own listeners; Flowbite itself no
longer subscribes.

The `Events` class export is unchanged for consumers who use it directly.

**No behavior change for `flowbite.js` (non-Turbo) consumers** — `AutoInit` is only
imported by `index.turbo.ts`. The main `index.ts` and the `flowbite.phoenix.ts`
entry are untouched (Phoenix can adopt `AutoInit` in a follow-up if desired).

## Testing

- Rails 8 + Hotwire smoke test covering:
  - Turbo Drive navigation between pages with Flowbite components on each.
  - Turbo Frame swap of a region containing a modal — old modal cleanly destroyed,
    new modal initialized, no zombie state.
  - Turbo Stream `replace` of a dropdown — listener correctly migrated to the
    replaced trigger.
  - Turbo Stream `append` of a drawer panel into the body — drawer is interactive
    immediately, no manual `initFlowbite()` call required.
  - Turbo Morph: page refresh with morph-driven element replacement — components
    inside replaced nodes are torn down + reinitialized.
- Manual verification that `stopAutoInit()` cleanly disconnects.

## Notes for reviewers

- `AutoInit` is intentionally minimal: 50-ish lines, no dependencies, observes a
  single root. It does **not** try to be a general-purpose framework integration
  layer — it just keeps Flowbite's existing component lifecycle in sync with DOM
  mutations.
- The `instances._instances` private access is avoided via `getAllInstances()`,
  which has been public since v4.x. No new private-API exposure.
- Builds on PRs 1 and 2. PR 1 (idempotency) ensures the per-mutation reinit is
  safe even if a node is added and removed in quick succession. PR 2 (scoped
  `root` param) ensures the per-mutation reinit is O(changes), not O(document).
