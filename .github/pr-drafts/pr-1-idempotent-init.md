# fix: make init functions idempotent to prevent zombie component state

## Closes / relates to

Closes #1042
Relates to #796, #1055, #998, #1102 (precondition for the broader Turbo lifecycle fix)

## Summary

Every `initX()` function in `src/components/*/index.ts` is currently destructive on
re-entry: a second call to `initFlowbite()` invokes each component constructor again,
and the constructor's `DefaultInstanceOptions.override = true` causes
`instances.addInstance(...)` to run `destroyAndRemoveInstance()` on the previously
registered instance, even when nothing in the DOM has changed. For visible components
this drops mid-interaction state (open modal becomes a "zombie" — see #1042); for
non-visible components it stacks duplicate event listeners on the same trigger
elements, doubling the response to each user click.

This PR makes every `initX()` function idempotent at the call site, without modifying
any component class or public API:

- **Instance-creation guard.** Before `new Component(...)`, check
  `instances.instanceExists('ComponentName', id)`. If true, skip — the existing
  instance is preserved.
- **Trigger-binding guard.** Before attaching a click handler to a trigger element,
  consult a new helper `markBoundTo(element, kind, owner)` (in
  `src/dom/idempotency.ts`). The helper compares against the *owner instance*, so
  destroy-and-recreate cases (component is destroyed, then a fresh instance is
  registered under the same id) correctly rebind triggers to the new owner.

## Files changed

- `src/dom/idempotency.ts` (new) — `markBoundTo(element, kind, owner)` helper.
  Uses a module-scoped `WeakMap<Element, { [kind: string]: object }>`. Auto-cleans
  when elements are GC'd.
- `src/components/modal/index.ts` — instance-creation guard + 3 trigger-binding
  guards (`modal-toggle`, `modal-show`, `modal-hide`).
- `src/components/drawer/index.ts` — instance-creation guard + 3 trigger-binding
  guards (`drawer-toggle`, `drawer-show`, `drawer-hide`).
- `src/components/dropdown/index.ts` — `markBoundTo` per `(trigger, panel)`
  pair, preserving the existing multi-trigger semantics.
- `src/components/collapse/index.ts` — `markBoundTo` per `(trigger, target)`
  pair. Fixes a pre-existing random-suffix-id leak where the multi-trigger
  fallback path created a fresh `Collapse` on every re-init.
- `src/components/carousel/index.ts` — instance-creation guard. The prev/next
  external button listeners further down `initCarousels()` are reachable only
  when a new `Carousel` is constructed, so the top-level guard also dedupes
  their attachment.
- `src/components/accordion/index.ts` — instance-creation guard.
- `src/components/dismiss/index.ts` — same.
- `src/components/dial/index.ts` — same.
- `src/components/tabs/index.ts` — same.
- `src/components/datepicker/index.ts` — same.
- `src/components/popover/index.ts` — same (constructor handles its own
  event binding via `_setupEventListeners`, so the instance-creation guard
  alone is sufficient).
- `src/components/tooltip/index.ts` — same.

`src/components/input-counter/index.ts` and `src/components/clipboard/index.ts`
already had `instanceExists` guards in tree and are unchanged in this PR.

## Backward compatibility

No API changes. No behavior change for first-time `initX()` calls. The only behavior
change is on *subsequent* calls: previously these tore down and rebuilt; now they are
no-ops on already-initialized DOM. Component class APIs, constructor signatures, and
`override:true` default for direct `new Component(...)` instantiation are unchanged.

`flowbite.turbo.js` consumers see immediate benefit: the current strategy of
re-running `initFlowbite()` on every `turbo:load` becomes safe (idempotent) rather
than destructive.

## Testing

- Manual smoke test against Rails 8 + Hotwire (Turbo Drive nav, Turbo Frame swap,
  Turbo Stream append/replace/morph) covering modal, dropdown, drawer, tabs.
- Verified pre-fix: open modal → trigger `initFlowbite()` → modal becomes a zombie
  (backdrop gone, body scroll-locked, target still visible). Post-fix: open modal
  stays exactly as the user left it.
- Verified click-listener stacking: pre-fix, calling `initFlowbite()` three times
  caused dropdown clicks to fire three handlers (toggle-toggle-toggle = open). Post-
  fix, exactly one handler fires regardless of init-call count.

## Notes for reviewers

- The constructor's `override: true` default is left intact — that's the documented
  behavior for programmatic instantiation and shouldn't change.
- Trigger-binding guards use owner-aware comparison so that destroy-then-recreate
  (which is what `MutationObserver`-based lifecycle in a follow-up PR will do)
  correctly rebinds. A simple "has this element been bound at all" `WeakSet` would
  silently leave triggers wired to destroyed instances.
- This PR is the smallest of a planned three-PR series — see #796 for the broader
  plan. PRs 2 and 3 (scoping + `AutoInit` `MutationObserver`) build on this
  groundwork; they are not part of this PR.
