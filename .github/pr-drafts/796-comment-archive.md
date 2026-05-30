# Archive: comment posted on themesberg/flowbite#796

**Date posted:** 2026-05-30
**Link:** https://github.com/themesberg/flowbite/issues/796#issuecomment-4583458690
**Default action triggers:** ~2026-06-13 (open PR 1 if no maintainer response)

---

@zoltanszogyenyi @roberttanislav — I want to do a focused piece of work to make Flowbite **first-class for Rails / Hotwire / Stimulus**, addressing this issue and the cluster of related ones in one coordinated push. That means:

**Upstream (this repo, via 3 sequential PRs):**

1. **Idempotency guards** on every `initX()` — re-running becomes a no-op when instances already exist; trigger-binding loops dedupe via owner-aware comparison. Closes #1042 standalone. Zero API change.
2. **Optional `root: ParentNode = document`** param on `initX()` / `initFlowbite()`. No behavior change at existing call sites.
3. **`AutoInit` module** — single `MutationObserver` on `document.body`, teardown-then-init on `childList` mutations. Rewrites `index.turbo.ts` to drop the four event listeners. Framework-agnostic — also helps Phoenix LiveView, Next.js, Nuxt, Blazor, Angular SSR.

Closes/relates to: #796, #1042, #1055, #998, #1102, #1111, #1123, #986, #1051, #1027, #989.

**Downstream (separate gem I'm building):** a Stimulus-controller library that honors Flowbite's existing `data-*-toggle` markup conventions, so any Flowbite copy-paste example works in a Hotwire app with proper lifecycle. This is happening regardless of upstream decisions — it gets way better if the upstream PRs land, because the Stimulus controllers can lean on `AutoInit` instead of re-implementing it.

PR 1 is already implemented on a fork (`mwlang/flowbite#fix/idempotent-init`); I'll smoke-test against Rails 8 + Turbo Drive/Frame/Stream before pushing.

**Three yes/no questions:**

1. **Will you merge this approach if PR 1 lands clean?** If you have a different direction in mind for #796, please sketch it and I'll redirect. The work happens either way; the question is whether it happens upstream or on a published fork.
2. **`flowbite.turbo.js` backward compat:** is removing the four event listeners acceptable in a v4.x minor (PR 3 makes them no-ops anyway), or do you want them kept for one release behind an opt-in flag and removed in v5?
3. **New dev dep — Vitest + JSDOM** for idempotency / AutoInit lifecycle unit tests. Yes or no?

**Default action if I don't hear back within ~2 weeks:** I open PR 1 as-is (safe regardless of #2 and #3), continue PRs 2 and 3, and ship the downstream Stimulus library. I'd genuinely rather coordinate with you than ship in parallel — let me know.
