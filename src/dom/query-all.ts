/**
 * `root.querySelectorAll(selector)` only searches descendants of `root` —
 * it never matches `root` itself, even when `root` carries the attribute
 * being searched for.
 *
 * That's invisible for the old, document-wide scan (`document` never
 * matches a component selector), but it's a real gap for the scoped
 * `initX(root)` functions added for AutoInit (#796, #1042, #1055): a
 * `MutationObserver`'s `addedNodes` entry is often the component element
 * itself, not a wrapper around it — e.g. a Turbo Frame response with no
 * wrapper around its top-level element, or any framework that inserts a
 * single node rather than a subtree. In that case `root.querySelectorAll(...)`
 * finds nothing, and the component silently never initializes.
 *
 * Use this in place of `root.querySelectorAll(selector)` at the top of
 * every `initX()` loop.
 */
export function queryIncludingSelf<E extends Element = Element>(
    root: ParentNode,
    selector: string
): E[] {
    const results = Array.from(root.querySelectorAll<E>(selector));
    if (root instanceof Element && root.matches(selector)) {
        results.unshift(root as E);
    }
    return results;
}
