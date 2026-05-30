import { initAccordions } from './accordion';
import { initCarousels } from './carousel';
import { initCopyClipboards } from './clipboard';
import { initCollapses } from './collapse';
import { initDials } from './dial';
import { initDismisses } from './dismiss';
import { initDrawers } from './drawer';
import { initDropdowns } from './dropdown';
import { initInputCounters } from './input-counter';
import { initModals } from './modal';
import { initPopovers } from './popover';
import { initTabs } from './tabs';
import { initTooltips } from './tooltip';
import { initDatepickers } from './datepicker';

export function initFlowbite(root: ParentNode = document) {
    initAccordions(root);
    initCollapses(root);
    initCarousels(root);
    initDismisses(root);
    initDropdowns(root);
    initModals(root);
    initDrawers(root);
    initTabs(root);
    initTooltips(root);
    initPopovers(root);
    initDials(root);
    initInputCounters(root);
    initCopyClipboards(root);
    initDatepickers(root);
}

if (typeof window !== 'undefined') {
    window.initFlowbite = initFlowbite;
}
