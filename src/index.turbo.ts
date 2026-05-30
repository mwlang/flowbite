// core components
import Accordion from './components/accordion';
import Carousel from './components/carousel';
import Collapse from './components/collapse';
import Dial from './components/dial';
import Dismiss from './components/dismiss';
import Drawer from './components/drawer';
import Dropdown from './components/dropdown';
import Modal from './components/modal';
import Popover from './components/popover';
import Tabs from './components/tabs';
import Tooltip from './components/tooltip';
import InputCounter from './components/input-counter';
import CopyClipboard from './components/clipboard';
import Datepicker from './components/datepicker';
import { initFlowbite } from './components/index';
import { startAutoInit, stopAutoInit } from './dom/auto-init';
import Events from './dom/events';

/**
 * Turbo / SPA-friendly entry point.
 *
 * The previous strategy attached four event listeners (`turbo:load`,
 * `turbo:frame-load`, `turbo:render`, `turbo:after-stream-render`) and
 * re-ran `initFlowbite()` on the whole document for every event. That
 * was both over-eager (re-initializing components in unchanged DOM,
 * dropping mid-interaction state — see #1042) and under-reaching (DOM
 * injected outside Turbo's lifecycle was never picked up — see #1123).
 *
 * The new strategy: a single `MutationObserver` on `document.body`
 * (`startAutoInit`) detects every DOM mutation and tears down /
 * initializes components in the affected subtrees only. Framework-
 * agnostic — also handles Phoenix LiveView, Next.js navigations,
 * vanilla innerHTML, etc.
 *
 * `initFlowbite()` still runs once at startup for components present
 * in the initial server-rendered HTML.
 *
 * Issue references: #796, #1042, #1055, #998, #1102, #1111, #1123,
 * #986, #1051.
 */

const start = () => {
    initFlowbite();
    startAutoInit(document.body);
};

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
}

export { startAutoInit, stopAutoInit };

export default {
    Accordion,
    Carousel,
    Collapse,
    Dial,
    Drawer,
    Dismiss,
    Dropdown,
    Modal,
    Popover,
    Tabs,
    Tooltip,
    InputCounter,
    CopyClipboard,
    Datepicker,
    Events,
};
