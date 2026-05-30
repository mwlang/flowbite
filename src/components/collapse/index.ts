/* eslint-disable @typescript-eslint/no-empty-function */
import type { CollapseOptions } from './types';
import type { InstanceOptions } from '../../dom/types';
import { CollapseInterface } from './interface';
import instances from '../../dom/instances';
import { markBoundTo } from '../../dom/idempotency';

const Default: CollapseOptions = {
    onCollapse: () => {},
    onExpand: () => {},
    onToggle: () => {},
};

const DefaultInstanceOptions: InstanceOptions = {
    id: null,
    override: true,
};

class Collapse implements CollapseInterface {
    _instanceId: string;
    _targetEl: HTMLElement | null;
    _triggerEl: HTMLElement | null;
    _options: CollapseOptions;
    _visible: boolean;
    _initialized: boolean;
    _clickHandler: EventListenerOrEventListenerObject;

    constructor(
        targetEl: HTMLElement | null = null,
        triggerEl: HTMLElement | null = null,
        options: CollapseOptions = Default,
        instanceOptions: InstanceOptions = DefaultInstanceOptions
    ) {
        this._instanceId = instanceOptions.id
            ? instanceOptions.id
            : targetEl.id;
        this._targetEl = targetEl;
        this._triggerEl = triggerEl;
        this._options = { ...Default, ...options };
        this._visible = false;
        this._initialized = false;
        this.init();
        instances.addInstance(
            'Collapse',
            this,
            this._instanceId,
            instanceOptions.override
        );
    }

    init() {
        if (this._triggerEl && this._targetEl && !this._initialized) {
            if (this._triggerEl.hasAttribute('aria-expanded')) {
                this._visible =
                    this._triggerEl.getAttribute('aria-expanded') === 'true';
            } else {
                // fix until v2 not to break previous single collapses which became dismiss
                this._visible = !this._targetEl.classList.contains('hidden');
            }

            this._clickHandler = () => {
                this.toggle();
            };

            this._triggerEl.addEventListener('click', this._clickHandler);
            this._initialized = true;
        }
    }

    destroy() {
        if (this._triggerEl && this._initialized) {
            this._triggerEl.removeEventListener('click', this._clickHandler);
            this._initialized = false;
        }
    }

    removeInstance() {
        instances.removeInstance('Collapse', this._instanceId);
    }

    destroyAndRemoveInstance() {
        this.destroy();
        this.removeInstance();
    }

    collapse() {
        this._targetEl.classList.add('hidden');
        if (this._triggerEl) {
            this._triggerEl.setAttribute('aria-expanded', 'false');
        }
        this._visible = false;

        // callback function
        this._options.onCollapse(this);
    }

    expand() {
        this._targetEl.classList.remove('hidden');
        if (this._triggerEl) {
            this._triggerEl.setAttribute('aria-expanded', 'true');
        }
        this._visible = true;

        // callback function
        this._options.onExpand(this);
    }

    toggle() {
        if (this._visible) {
            this.collapse();
        } else {
            this.expand();
        }
        // callback function
        this._options.onToggle(this);
    }

    updateOnCollapse(callback: () => void) {
        this._options.onCollapse = callback;
    }

    updateOnExpand(callback: () => void) {
        this._options.onExpand = callback;
    }

    updateOnToggle(callback: () => void) {
        this._options.onToggle = callback;
    }
}

export function initCollapses(root: ParentNode = document) {
    root.querySelectorAll('[data-collapse-toggle]').forEach(($triggerEl) => {
        const targetId = $triggerEl.getAttribute('data-collapse-toggle');
        const $targetEl = document.getElementById(targetId);

        // check if the target element exists
        if ($targetEl) {
            // idempotency: each (trigger, target) pair is bound at most
            // once. Without this guard the multi-trigger code path below
            // leaks a fresh Collapse instance with a random-suffix id on
            // every re-init, since the second branch never deduplicates.
            if (!markBoundTo($triggerEl, 'collapse-toggle', $targetEl)) {
                return;
            }
            if (
                !instances.instanceExists(
                    'Collapse',
                    $targetEl.getAttribute('id')
                )
            ) {
                new Collapse(
                    $targetEl as HTMLElement,
                    $triggerEl as HTMLElement
                );
            } else {
                // Multiple triggers can drive the same collapse target.
                // Each additional trigger gets its own Collapse instance
                // with a random-suffix id. The markBoundTo guard above
                // ensures this only happens once per (trigger, target)
                // pair, not on every re-init.
                new Collapse(
                    $targetEl as HTMLElement,
                    $triggerEl as HTMLElement,
                    {},
                    {
                        id:
                            $targetEl.getAttribute('id') +
                            '_' +
                            instances._generateRandomId(),
                    }
                );
            }
        } else {
            console.error(
                `The target element with id "${targetId}" does not exist. Please check the data-collapse-toggle attribute.`
            );
        }
    });
}

if (typeof window !== 'undefined') {
    window.Collapse = Collapse;
    window.initCollapses = initCollapses;
}

export default Collapse;
