import { Events } from 'framework/events';
import { Features } from 'util/features';
import { pick } from 'util/fn';

const Tip = function (el, config) {
    this.el = el;
    this.title = (config && config.title) || el.attr('title');
    this.placement = (config && config.placement) || el.attr('tip-placement');
    this.fast = (config && config.fast) || false;
    this.tipEl = null;
    this.showTimeout = null;
    this.hideTimeout = null;
    this.force = (config && config.force) || false;
    this.hide = this.hide.bind(this);
    this.destroy = this.destroy.bind(this);
    this.mouseenter = this.mouseenter.bind(this);
    this.mouseleave = this.mouseleave.bind(this);
};

Tip.enabled = !Features.isMobile;

Tip.prototype.init = function () {
    if (!Tip.enabled) {
        return;
    }
    this.el.removeAttr('title');
    this.el.attr('data-title', this.title);
    this.el.mouseenter(this.mouseenter).mouseleave(this.mouseleave);
    this.el.click(this.mouseleave);
};

Tip.prototype.show = function () {
    if ((!Tip.enabled && !this.force) || !this.title) {
        return;
    }
    Events.on('page-geometry', this.hide);
    if (this.tipEl) {
        this.tipEl.remove();
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }
    const tipEl = (this.tipEl = $('<div></div>').addClass('tip').appendTo('body').text(this.title));
    const rect = this.el[0].getBoundingClientRect();
    const tipRect = this.tipEl[0].getBoundingClientRect();
    const placement = this.placement || this.getAutoPlacement(rect, tipRect);
    tipEl.addClass('tip--' + placement);
    if (this.fast) {
        tipEl.addClass('tip--fast');
    }
    let top, left;
    const offset = 10;
    const sideOffset = 10;
    switch (placement) {
        case 'top':
            top = rect.top - tipRect.height - offset;
            left = rect.left + rect.width / 2 - tipRect.width / 2;
            break;
        case 'top-left':
            top = rect.top - tipRect.height - offset;
            left = rect.left + rect.width / 2 - tipRect.width + sideOffset;
            break;
        case 'bottom':
            top = rect.bottom + offset;
            left = rect.left + rect.width / 2 - tipRect.width / 2;
            break;
        case 'left':
            top = rect.top + rect.height / 2 - tipRect.height / 2;
            left = rect.left - tipRect.width - offset;
            break;
        case 'right':
            top = rect.top + rect.height / 2 - tipRect.height / 2;
            left = rect.right + offset;
            break;
    }
    tipEl.css({ top, left });
};

Tip.prototype.hide = function () {
    if (this.tipEl) {
        this.tipEl.remove();
        this.tipEl = null;
        Events.off('page-geometry', this.hide);
    }
};

Tip.prototype.destroy = function () {
    this.hide();

    this.el.off('mouseenter', this.mouseenter);
    this.el.off('mouseleave', this.mouseleave);
    this.el.off('click', this.mouseleave);

    if (this.showTimeout) {
        clearTimeout(this.showTimeout);
        this.showTimeout = null;
    }
    if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
    }
};

Tip.prototype.mouseenter = function () {
    if (this.showTimeout) {
        return;
    }
    this.showTimeout = setTimeout(() => {
        this.showTimeout = null;
        this.show();
    }, 200);
};

Tip.prototype.mouseleave = function () {
    if (this.tipEl) {
        this.tipEl.addClass('tip--hide');
        this.hideTimeout = setTimeout(() => {
            this.hideTimeout = null;
            this.hide();
        }, 500);
    }
    if (this.showTimeout) {
        clearTimeout(this.showTimeout);
        this.showTimeout = null;
    }
};

Tip.prototype.getAutoPlacement = function (rect, tipRect) {
    const padding = 20;
    const bodyRect = document.body.getBoundingClientRect();
    const canShowToBottom = bodyRect.bottom - rect.bottom > padding + tipRect.height;
    const canShowToHalfRight = bodyRect.right - rect.right > padding + tipRect.width / 2;
    const canShowToRight = bodyRect.right - rect.right > padding + tipRect.width;
    const canShowToHalfLeft = rect.left > padding + tipRect.width / 2;
    const canShowToLeft = rect.left > padding + tipRect.width;
    if (canShowToBottom) {
        if (canShowToLeft && !canShowToHalfRight) {
            return 'left';
        } else if (canShowToRight && !canShowToHalfLeft) {
            return 'right';
        } else {
            return 'bottom';
        }
    }
    if (canShowToLeft && !canShowToHalfRight) {
        return 'left';
    } else if (canShowToRight && !canShowToHalfLeft) {
        return 'right';
    } else {
        return 'top';
    }
};

Tip.createTips = function (container) {
    if (!Tip.enabled) {
        return;
    }
    $('[title]', container).each((ix, el) => {
        Tip.createTip(el);
    });
};

Tip.createTip = function (el, options) {
    if (!Tip.enabled && (!options || !options.force)) {
        return;
    }
    const tip = new Tip($(el), options);
    if (!options || !options.noInit) {
        tip.init();
    }
    el._tip = tip;
    return tip;
};

Tip.hideTips = function (container) {
    if (!Tip.enabled || !container) {
        return;
    }
    $('[data-title]', container).each((ix, el) => {
        Tip.hideTip(el);
    });
};

Tip.hideTip = function (el) {
    if (el._tip) {
        el._tip.hide();
    }
};

Tip.updateTip = function (el, props) {
    if (el._tip) {
        el._tip.hide();
        Object.assign(
            el._tip,
            pick(props, ['title', 'placement', 'fast', 'showTimeout', 'hideTimeout'])
        );
    }
};

Tip.destroyTips = function (container) {
    $('[data-title]', container).each((ix, el) => {
        if (el._tip) {
            el._tip.destroy();
            el._tip = undefined;
        }
    });
};

export { Tip };
