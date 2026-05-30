# Smoke test — Flowbite Hotwire/Stimulus fork

This page exercises the three-layer fix (idempotency, scoping, AutoInit)
against the lifecycle scenarios reported in the issues this fork addresses
(#796, #1042, #1055, #998, #1102, #1123).

## Run

The bundle `flowbite.turbo.bundle.js` is gitignored — build it from the
current branch first:

```bash
# from repo root
npx esbuild src/index.turbo.ts \
    --bundle \
    --format=iife \
    --global-name=Flowbite \
    --outfile=examples/flowbite.turbo.bundle.js \
    --target=es2020 \
    --loader:.css=empty
```

Then open `examples/turbo-smoke-test.html` in a browser.

The test suite auto-runs ~200ms after load and reports PASS / FAIL for:

1. **`idempotent-init`** — calling `window.initFlowbite()` three times in
   a row does not recreate instances; same instance refs survive.
2. **`zombie-modal-fix`** — open a modal, call `initFlowbite()`, modal
   stays open with the same instance ref (regression test for #1042).
3. **`stacking`** — after 5 `initFlowbite()` calls, a dropdown trigger
   click still fires exactly one toggle (regression test for the
   stacking-listener bug).
4. **`auto-init-injection`** — inject a modal via `innerHTML`,
   MutationObserver fires `initFlowbite(node)` on the new subtree, the
   modal is registered automatically (#796).
5. **`auto-teardown`** — empty the injection zone, MutationObserver
   tears down the instance via `destroyAndRemoveInstance()`.
6. **`replace-children`** — `replaceChildren()` (Turbo Morph–style
   mutation) tears down v1 and registers a fresh v2 in the same batch
   (#1123).

Manual buttons below the auto-run log let you repeat each scenario.

## Why this is a static HTML page rather than a full Rails app

The lifecycle behavior we want to verify is pure browser-side DOM mutation
handling. Turbo, Phoenix LiveView, Next.js client-side navigation, and
`replaceChildren()` are all "things that mutate the DOM" — they're
indistinguishable from the AutoInit observer's perspective. A static
page driving the same mutation primitives is a faithful smoke test
and faster to UAT than spinning up a server.
