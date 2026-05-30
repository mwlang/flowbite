/**
 * AutoInit — MutationObserver-driven lifecycle management for Flowbite
 * components. Replaces the event-listener-based Turbo strategy with a
 * framework-agnostic approach: any DOM mutation (Turbo Drive, Turbo Frame,
 * Turbo Stream, Turbo Morph, Hotwire morph, Phoenix LiveView patch,
 * Next.js client navigation, jQuery `.html()`, plain `innerHTML`)
 * automatically tears down components in removed subtrees and
 * initializes components in added subtrees.
 *
 * Builds on PR 1 (idempotency guards — every initX is safe to call on
 * the same DOM repeatedly) and PR 2 (each initX accepts a `root`
 * parameter so we can scope the rescan to just the added subtree).
 *
 * Issue references: #796, #1042, #1055, #998, #1102, #1123, #986, #1051
 */
import { initFlowbite } from '../components/index';
import instances from './instances';

let observer: MutationObserver | null = null;
let observedRoot: ParentNode | null = null;

/**
 * The set of component buckets the lifecycle manager knows about.
 * Drives teardown when nodes are removed — we look up each instance
 * by its registered key, check whether its target element is contained
 * in the removed subtree, and call destroyAndRemoveInstance() if so.
 */
const COMPONENT_TYPES = [
    'Accordion',
    'Carousel',
    'Collapse',
    'Dial',
    'Dismiss',
    'Drawer',
    'Dropdown',
    'Modal',
    'Popover',
    'Tabs',
    'Tooltip',
    'InputCounter',
    'CopyClipboard',
    'Datepicker',
] as const;

/**
 * Walks the registered instances and tears down any whose target element
 * is contained in (or equal to) the removed node. Uses public
 * `instances.getInstances(component)` and the `_targetEl` field every
 * component already exposes — no new private-API access.
 */
function destroyInstancesIn(node: Node): void {
    if (!(node instanceof Element)) return;

    for (const type of COMPONENT_TYPES) {
        const bucket = instances.getInstances(type);
        if (!bucket) continue;
        const ids = Object.keys(bucket);
        for (const id of ids) {
            // Component instances use different private field names for
            // their root element across the suite (_targetEl on most,
            // _accordionEl on Accordion, _tabsEl on Tabs, _datepickerEl
            // on Datepicker, _parentEl on Dial). Read them dynamically.
            const inst = bucket[id] as unknown as Record<string, unknown>;
            const el = (inst._targetEl ||
                inst._accordionEl ||
                inst._tabsEl ||
                inst._datepickerEl ||
                inst._parentEl) as Element | null;
            if (el instanceof Element && (node === el || node.contains(el))) {
                (
                    bucket[id] as { destroyAndRemoveInstance: () => void }
                ).destroyAndRemoveInstance();
            }
        }
    }
}

/**
 * Initialize Flowbite components in any newly-added subtree.
 * `initFlowbite(node)` is idempotent (PR 1) and scoped (PR 2), so this
 * is safe to call on every added node without double-init or O(document)
 * scans.
 */
function initInstancesIn(node: Node): void {
    if (!(node instanceof Element)) return;
    initFlowbite(node);
}

/**
 * Start observing DOM mutations on `root` (default: `document.body`)
 * and keep Flowbite components in sync with the DOM. Calls are
 * idempotent — starting twice with the same root is a no-op; starting
 * with a different root reconnects to the new root.
 */
export function startAutoInit(root: ParentNode = document.body): void {
    if (observer && observedRoot === root) return;
    if (observer) stopAutoInit();

    observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            // Tear-down BEFORE init so that Turbo Morph and other
            // replace-style mutations (same observation batch contains
            // both a removal and an addition for the same id) end up
            // with a fresh component instance, not a stale one.
            m.removedNodes.forEach(destroyInstancesIn);
            m.addedNodes.forEach(initInstancesIn);
        }
    });

    observer.observe(root, { childList: true, subtree: true });
    observedRoot = root;
}

/**
 * Disconnect the MutationObserver. Idempotent — calling when not
 * started is a no-op.
 */
export function stopAutoInit(): void {
    if (observer) {
        observer.disconnect();
        observer = null;
        observedRoot = null;
    }
}

if (typeof window !== 'undefined') {
    window.startAutoInit = startAutoInit;
    window.stopAutoInit = stopAutoInit;
}
