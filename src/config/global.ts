import Accordion from '../components/accordion';
import Carousel from '../components/carousel';
import Collapse from '../components/collapse';
import Dial from '../components/dial';
import Dismiss from '../components/dismiss';
import Drawer from '../components/drawer';
import Dropdown from '../components/dropdown';
import Modal from '../components/modal';
import Popover from '../components/popover';
import Tabs from '../components/tabs';
import Tooltip from '../components/tooltip';
import InputCounter from '../components/input-counter';
import Clipboard from '../components/clipboard';
import Datepicker from '../components/datepicker';

declare global {
    interface Window {
        Accordion: typeof Accordion;
        Carousel: typeof Carousel;
        Collapse: typeof Collapse;
        Dial: typeof Dial;
        Dismiss: typeof Dismiss;
        Drawer: typeof Drawer;
        Dropdown: typeof Dropdown;
        Modal: typeof Modal;
        Popover: typeof Popover;
        Tabs: typeof Tabs;
        Tooltip: typeof Tooltip;
        InputCounter: typeof InputCounter;
        CopyClipboard: typeof Clipboard;
        Datepicker: typeof Datepicker;
        initAccordions: (root?: ParentNode) => void;
        initCarousels: (root?: ParentNode) => void;
        initCollapses: (root?: ParentNode) => void;
        initDials: (root?: ParentNode) => void;
        initDismisses: (root?: ParentNode) => void;
        initDrawers: (root?: ParentNode) => void;
        initDropdowns: (root?: ParentNode) => void;
        initModals: (root?: ParentNode) => void;
        initPopovers: (root?: ParentNode) => void;
        initTabs: (root?: ParentNode) => void;
        initTooltips: (root?: ParentNode) => void;
        initInputCounters: (root?: ParentNode) => void;
        initClipboards: (root?: ParentNode) => void;
        initDatepickers: (root?: ParentNode) => void;
        initFlowbite: (root?: ParentNode) => void;
        FlowbiteInstances: any;
        startAutoInit: (root?: ParentNode) => void;
        stopAutoInit: () => void;
    }
}
