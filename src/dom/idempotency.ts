/**
 * Idempotency helpers shared across all `initX()` functions.
 *
 * Flowbite's init functions get called repeatedly in Turbo / SPA contexts
 * (and now from AutoInit's MutationObserver). Without guards, each call
 * recreates component instances and stacks duplicate event listeners on
 * trigger elements, producing zombie state — see issues #796, #1042,
 * #1055, #998.
 *
 * The guard compares against the *owner* (the component instance that
 * would own the binding), not just "has this been bound at all" — so
 * destroying a component and recreating it correctly rebinds, even
 * though the trigger element itself never left the DOM.
 */

type Bindings = { [kind: string]: object };

const boundElements = new WeakMap<Element, Bindings>();

/**
 * Returns true if the (element, kind, owner) tuple is new — and records
 * it. Returns false if this exact owner has already bound this kind on
 * this element.
 *
 * Use at the top of every trigger-binding loop in an initX() function:
 *
 *   if (!markBoundTo($triggerEl, 'modal-toggle', modal)) return;
 *   $triggerEl.addEventListener('click', handler);
 *   modal.addEventListenerInstance($triggerEl, 'click', handler);
 *
 * Owner-aware comparison handles destroy-and-recreate correctly: when
 * a component is destroyed and a fresh instance is created later for
 * the same id, the new instance is a different reference, so the guard
 * returns true and rebinds.
 */
export function markBoundTo(
    element: Element,
    kind: string,
    owner: object
): boolean {
    let bindings = boundElements.get(element);
    if (!bindings) {
        bindings = {};
        boundElements.set(element, bindings);
    }
    if (bindings[kind] === owner) return false;
    bindings[kind] = owner;
    return true;
}

/**
 * Clears the binding marker for a single (element, kind) pair. Optional —
 * the owner-aware comparison in markBoundTo already handles destroy-and-
 * recreate without explicit clearing. Provided for components that want
 * to be explicit about teardown.
 */
export function clearBinding(element: Element, kind: string): void {
    const bindings = boundElements.get(element);
    if (bindings) delete bindings[kind];
}
