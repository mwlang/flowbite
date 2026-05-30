# Integrating `mwlang/flowbite` (Hotwire-friendly fork) into a Rails 8.1 app

> **AI assistant: read this in full before acting.** It's self-contained — you don't need any prior conversation context. The user is integrating their own fork of Flowbite into their Rails 8.1 application. This document tells you exactly what to do.

## What this fork is and why it exists

`mwlang/flowbite` is a fork of [`themesberg/flowbite`](https://github.com/themesberg/flowbite) that fixes Flowbite's broken behavior under Turbo and other DOM-mutating frameworks (Hotwire morph, Phoenix LiveView, Next.js, plain `innerHTML`). It adds three layers on top of v4.0.x:

1. **Idempotency guards** on every `initX()` — re-running `initFlowbite()` no longer destroys-and-recreates components (fixes the "zombie modal" issue where an open modal gets torn down mid-interaction).
2. **Scoped init** — every `initX()` accepts an optional `root: ParentNode = document` parameter.
3. **`AutoInit`** — a single `MutationObserver` on `document.body` automatically tears down components in removed subtrees and initializes components in added subtrees. The four `turbo:*` event listeners that vanilla Flowbite uses are gone — `AutoInit` is framework-agnostic.

The integration branch that bundles all three layers is **`feat/hotwire-stimulus-modernization`**. Pin / build from that branch.

Related upstream issues this fork addresses: #796, #1042, #1055, #998, #1102, #1111, #1123, #986, #1051.

## Repository location

The fork lives **one directory up from the Rails app**:

```
~/projects/
├── flowbite/        ← this fork (mwlang/flowbite)
└── <rails-app>/     ← the Rails app you're working in
```

So from inside the Rails app, the fork is at `../flowbite`.

## Step 0 — inspect the Rails app's current setup

Before doing anything, figure out the app's JS and CSS bundling approach. Run these in the Rails app root:

```bash
cat Gemfile.lock | grep -E '^\s+(importmap-rails|jsbundling-rails|cssbundling-rails|tailwindcss-rails|turbo-rails|stimulus-rails)' | sort -u
ls config/importmap.rb 2>/dev/null && echo "uses importmap-rails"
ls package.json 2>/dev/null && cat package.json | grep -E '"(esbuild|webpack|rollup|tailwindcss|flowbite)"'
ls app/javascript/application.js 2>/dev/null || ls app/javascript/application.ts 2>/dev/null
ls config/tailwind.config.js 2>/dev/null || ls tailwind.config.js 2>/dev/null
```

This tells you which **path** below to follow:

- **Path A** — app uses `importmap-rails` (no Node bundler). Most common for Rails 8.1 unless the user opted out.
- **Path B** — app uses `jsbundling-rails` with esbuild. You'll see `bin/dev`, a `build:js` npm script, and a `package.json`.

For Tailwind:
- **standalone** — app uses `tailwindcss-rails` gem with no `tailwindcss` in `package.json`. Uses the bundled Tailwind binary, no Node needed.
- **Node** — app uses `cssbundling-rails` (or `tailwindcss-rails` with `--postcss`) and has `tailwindcss` + `postcss` in `package.json`.

The fork's Flowbite plugin requires Node-based Tailwind. **If the app is on standalone Tailwind, you'll need to migrate to Node-based Tailwind** (use `bin/rails css:install:tailwind` after adding `cssbundling-rails`, or document the path to the user — don't migrate without explicit consent since it's a real change).

---

## Path A — `importmap-rails` (no Node bundler in Rails app)

Build the fork to a single IIFE bundle once and vendor it.

### A.1 Build the bundle from the fork

```bash
cd ../flowbite
git fetch origin
git checkout feat/hotwire-stimulus-modernization
git pull origin feat/hotwire-stimulus-modernization

# install deps once
test -d node_modules || npm install

# bundle (esbuild bypasses the pre-existing webpack docs.js issue)
npx esbuild src/index.turbo.ts \
    --bundle \
    --format=esm \
    --outfile=dist-fork/flowbite.turbo.esm.js \
    --target=es2020 \
    --loader:.css=empty
```

(Use `--format=esm` for importmap-rails since the asset is loaded as an ES module.)

### A.2 Vendor it into the Rails app

```bash
cd <rails-app>
mkdir -p vendor/javascript
cp ../flowbite/dist-fork/flowbite.turbo.esm.js vendor/javascript/flowbite.js
```

### A.3 Pin it in importmap

Edit `config/importmap.rb`:

```ruby
pin "flowbite", to: "flowbite.js"
```

(`importmap-rails` serves files from `vendor/javascript/` automatically via Propshaft; the `to:` is relative to that path.)

### A.4 Import in `app/javascript/application.js`

```javascript
import "@hotwired/turbo-rails"
import "controllers"
import "flowbite"   // ← add this
```

The fork auto-starts on `DOMContentLoaded`: it runs `initFlowbite()` once for server-rendered components, then sets up the `MutationObserver` for everything after. **You do not need to call `initFlowbite()` yourself anywhere.** Turbo navigations, Turbo Frame swaps, Turbo Stream appends, and Turbo Morph all "just work."

If the app needs programmatic access (rare), it's available as `window.Flowbite`, `window.initFlowbite`, `window.FlowbiteInstances`, `window.startAutoInit`, `window.stopAutoInit`.

---

## Path B — `jsbundling-rails` with esbuild

Two sub-options. **B.1 (vendor copy)** is simpler; **B.2 (file: dep)** tracks the fork live as you update it.

### B.1 — Vendor the source (recommended for stability)

Same as Path A.1 + A.2 + A.3 + A.4, except the import line goes in whatever entry point esbuild bundles (typically `app/javascript/application.js`), and there's no `importmap.rb` step.

### B.2 — `file:` dependency on the sibling fork

In the Rails app's `package.json`:

```json
{
  "dependencies": {
    "flowbite": "file:../flowbite"
  }
}
```

Then in the Rails app:

```bash
cd <rails-app>
npm install
```

In `app/javascript/application.js`:

```javascript
import "@hotwired/turbo-rails"
import "controllers"
import "flowbite/dist/flowbite.turbo"
```

Wait — vanilla Flowbite ships `dist/flowbite.turbo.js`, but the fork's `dist/` is gitignored (the user hasn't checked in built artifacts). You need to build it on the fork side first:

```bash
cd ../flowbite
npm run build:lib   # builds lib/cjs and lib/esm
```

Then in `app/javascript/application.js`:

```javascript
import "flowbite/lib/esm/index.turbo"
```

The `lib/esm` build keeps bare imports (`import { initFlowbite } from './components/index'`). Your Rails app's esbuild step resolves them because the file: dep includes the full source tree.

**Tradeoff**: B.2 means `git pull` in the fork is enough to update — no rebuild-and-recopy in the Rails app. But it couples the two repos. Pick B.1 unless you'll be iterating on the fork.

---

## Tailwind setup (required regardless of path)

### Detect the Tailwind variant

```bash
grep -r "tailwindcss-rails" Gemfile.lock 2>/dev/null
ls bin/dev 2>/dev/null && cat bin/dev | grep -E "(tailwind|css)"
cat package.json 2>/dev/null | grep -E '"(tailwindcss|@tailwindcss)"'
```

### If standalone Tailwind (`tailwindcss-rails` only, no `tailwindcss` npm dep)

The standalone binary doesn't load Node plugins. You have two choices:

1. **Skip the Flowbite plugin entirely.** Most Flowbite components work without the plugin — you just lose a few extra utility classes. Add the bundled output paths to `content`:

   In `config/tailwind.config.js`:
   ```javascript
   module.exports = {
     content: [
       './public/*.html',
       './app/views/**/*.{erb,haml,html,slim}',
       './app/helpers/**/*.rb',
       './app/javascript/**/*.js',
       './vendor/javascript/flowbite.js',   // ← add this if Path A.2
       // or '../flowbite/lib/esm/**/*.js'  // ← add this if Path B.2
     ],
     // no plugins section needed
   }
   ```

2. **Migrate to Node Tailwind** — only if the user explicitly asks. Adds `tailwindcss` + `postcss` + `cssbundling-rails` to the app. Larger change; out of scope for this integration unless requested.

### If Node Tailwind

Install the Flowbite plugin alongside the fork:

```bash
cd <rails-app>
# For Path A (vendored), use the npm package as a peer for the plugin only:
npm install --save-dev flowbite

# For Path B.2, the file: dep already includes the plugin source — no extra install.
```

In `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    './app/views/**/*.{erb,haml,html,slim}',
    './app/javascript/**/*.js',
    './vendor/javascript/flowbite.js',           // Path A
    // './node_modules/flowbite/**/*.js',        // Path B.2 with npm-installed flowbite
  ],
  plugins: [
    require('flowbite/plugin'),
  ],
}
```

---

## Optional: Gentelella dark-teal palette

If the user wants the classic Gentelella admin look, add this color palette to `tailwind.config.js`:

```javascript
module.exports = {
  content: [/* ... */],
  theme: {
    extend: {
      colors: {
        gentelella: {
          sidebar: '#2A3F54',   // dark-teal sidebar / headers
          primary: '#1ABB9C',   // primary accent / buttons
          muted:   '#73879C',   // muted text
          dark:    '#34495E',   // secondary dark
          bg:      '#F7F7F7',   // content background
        },
      },
    },
  },
}
```

Use as `bg-gentelella-sidebar`, `text-gentelella-primary`, etc.

This is the only piece the user wanted to preserve from their old `gentelella-rails` gem. Everything else (the jQuery plugin bundle, the layout) is replaced by Flowbite components.

---

## Verify the integration

After the steps above:

```bash
cd <rails-app>
bin/rails server
# or: bin/dev   (if jsbundling-rails)
```

Open the app in a browser, then in the dev console:

```javascript
typeof window.Flowbite           // → "object"
typeof window.initFlowbite       // → "function"
typeof window.startAutoInit      // → "function"
typeof window.FlowbiteInstances  // → "object"
```

Add a quick test view with a modal:

```erb
<button data-modal-target="ping" data-modal-toggle="ping"
        class="bg-blue-600 text-white px-3 py-1.5 rounded">Open modal</button>

<div id="ping" class="hidden fixed inset-0 z-50 items-center justify-center">
  <div class="bg-white rounded-lg shadow-xl p-6 max-w-md">
    <h3 class="font-bold mb-2">Ping</h3>
    <button data-modal-hide="ping"
            class="bg-slate-200 px-3 py-1.5 rounded">Close</button>
  </div>
</div>
```

Click the button — modal opens. Navigate away and back via Turbo Drive — modal still works (vanilla Flowbite breaks here). Open the modal, then in dev console run `window.initFlowbite()` — modal stays open (vanilla Flowbite zombies it).

If you want a thorough smoke test, the fork has `examples/turbo-smoke-test.html` — six automated lifecycle tests in a static HTML page. From the fork directory: build the IIFE bundle, run `python3 -m http.server`, open `examples/turbo-smoke-test.html`. (See `examples/README.md` in the fork.)

---

## Updating the fork

When `feat/hotwire-stimulus-modernization` gets new commits (upstream merges, additional fixes, etc.):

```bash
# in the fork
cd ../flowbite
git checkout feat/hotwire-stimulus-modernization
git pull origin feat/hotwire-stimulus-modernization

# rebuild (Path A or B.1)
npx esbuild src/index.turbo.ts --bundle --format=esm \
    --outfile=dist-fork/flowbite.turbo.esm.js \
    --target=es2020 --loader:.css=empty
```

Then in the Rails app:

```bash
# Path A or B.1
cp ../flowbite/dist-fork/flowbite.turbo.esm.js vendor/javascript/flowbite.js
git add vendor/javascript/flowbite.js
git commit -m "chore(deps): update vendored flowbite fork bundle"

# Path B.2 — no copy needed, just commit a refresh:
npm install
```

---

## When the upstream fork is replaced by themesberg/flowbite v5

The user is offering this fix upstream via PRs against `themesberg/flowbite`. If those merge into a future `flowbite@4.1` or `flowbite@5`, the fork becomes redundant. At that point:

1. Replace the fork dep with the official `npm install flowbite@<version>` or importmap pin to jsdelivr.
2. Drop the `file:../flowbite` reference if used.
3. Keep the Gentelella palette extension — that's user-owned.

For now, the fork is the source of truth. Track the upstream status via the comment on `themesberg/flowbite#796`.

---

## Summary checklist for the AI assistant

- [ ] Read this whole file before acting.
- [ ] Inspect the Rails app's bundling approach (Step 0).
- [ ] Pick Path A or Path B based on what's installed; ask the user if ambiguous.
- [ ] Build the bundle from `../flowbite` on the `feat/hotwire-stimulus-modernization` branch.
- [ ] Vendor / link / install per the chosen path.
- [ ] Add the import to `app/javascript/application.js`.
- [ ] Configure Tailwind `content` paths (and plugin if Node-based Tailwind).
- [ ] Verify in browser: `window.Flowbite`, `window.startAutoInit`, modal + Turbo nav.
- [ ] Stop and check in with the user before doing anything beyond integration — e.g., do not migrate from standalone to Node Tailwind without explicit consent.
