import morphdom from 'morphdom';
import EventEmitter from 'events';
import { Tip } from 'util/ui/tip';
import { KeyHandler } from 'comp/browser/key-handler';
import { Logger } from 'util/logger';

class View extends EventEmitter {
    parent = undefined;
    template = undefined;
    events = {};
    model = undefined;
    options = {};
    views = {};
    hidden = false;
    removed = false;
    boundEvents = [];
    debugLogger = localStorage.debugViews ? new Logger('view', this.constructor.name) : undefined;

    constructor(model = undefined, options = {}) {
        super();

        this.model = model;
        this.options = options;

        this.setMaxListeners(100);
    }

    render(templateData) {
        if (this.removed) {
            return;
        }

        let ts;
        if (this.debugLogger) {
            this.debugLogger.debug('Render start');
            ts = this.debugLogger.ts();
        }

        if (this.el) {
            Tip.destroyTips(this.el);
        }

        this.unbindEvents();
        this.renderElement(templateData);
        this.bindEvents();

        Tip.createTips(this.el);

        this.debugLogger && this.debugLogger.debug('Render finished', this.debugLogger.ts(ts));

        return this;
    }

    renderElement(templateData) {
        const html = this.template(templateData);
        if (this.el) {
            const mountRoot = this.options.ownParent ? this.el.firstChild : this.el;
            morphdom(mountRoot, html);
        } else {
            let parent = this.options.parent || this.parent;
            if (parent) {
                if (typeof parent === 'string') {
                    parent = document.querySelector(parent);
                }
                if (!parent) {
                    throw new Error(`Error rendering ${this.constructor.name}: parent not found`);
                }
                if (this.options.replace) {
                    Tip.destroyTips(parent);
                    parent.innerHTML = '';
                }
                const el = document.createElement('div');
                el.innerHTML = html;
                const root = el.firstChild;
                if (this.options.ownParent) {
                    if (root) {
                        parent.appendChild(root);
                    }
                    this.el = parent;
                } else {
                    this.el = root;
                    parent.appendChild(this.el);
                }
            } else {
                throw new Error(
                    `Error rendering ${this.constructor.name}: I don't know how to insert the view`
                );
            }
            this.$el = $(this.el); // legacy
        }
    }

    bindEvents() {
        for (const [eventDef, method] of Object.entries(this.events)) {
            const spaceIx = eventDef.indexOf(' ');
            let event, targets;
            if (spaceIx > 0) {
                event = eventDef.substr(0, spaceIx);
                const selector = eventDef.substr(spaceIx + 1);
                targets = this.el.querySelectorAll(selector);
            } else {
                event = eventDef;
                targets = [this.el];
            }
            for (const target of targets) {
                const listener = e => {
                    this.debugLogger && this.debugLogger.debug('Listener', method);
                    this[method](e);
                };
                target.addEventListener(event, listener);
                this.boundEvents.push({ target, event, listener });
            }
        }
    }

    unbindEvents() {
        for (const boundEvent of this.boundEvents) {
            const { target, event, listener } = boundEvent;
            target.removeEventListener(event, listener);
        }
    }

    remove() {
        this.emit('remove');

        this.removeInnerViews();
        Tip.hideTips(this.el);
        this.el.remove();
        this.removed = true;

        this.debugLogger && this.debugLogger.debug('Remove');
    }

    removeInnerViews() {
        if (this.views) {
            for (const view of Object.values(this.views)) {
                if (view) {
                    if (view instanceof Array) {
                        view.forEach(v => v.remove());
                    } else {
                        view.remove();
                    }
                }
            }
            this.views = {};
        }
    }

    listenTo(model, event, callback) {
        const boundCallback = callback.bind(this);
        model.on(event, boundCallback);
        this.once('remove', () => model.off(event, boundCallback));
    }

    hide() {
        Tip.hideTips(this.el);
        return this.toggle(false);
    }

    show() {
        return this.toggle(true);
    }

    toggle(visible) {
        this.debugLogger && this.debugLogger.debug(visible ? 'Show' : 'Hide');
        if (visible === undefined) {
            visible = this.hidden;
        }
        this.hidden = !visible;
        this.emit(visible ? 'show' : 'hide');
        if (this.el) {
            this.el.classList.toggle('show', !!visible);
            this.el.classList.toggle('hide', !visible);
            if (!visible) {
                Tip.hideTips(this.el);
            }
        }
    }

    isHidden() {
        return this.hidden;
    }

    isVisible() {
        return !this.hidden;
    }

    afterPaint(callback) {
        requestAnimationFrame(() => requestAnimationFrame(callback));
    }

    onKey(key, handler, shortcut, modal, noPrevent) {
        KeyHandler.onKey(key, handler, this, shortcut, modal, noPrevent);
        this.once('remove', () => KeyHandler.offKey(key, handler, this));
    }

    off(event, listener) {
        if (listener === undefined) {
            return super.removeAllListeners(event);
        } else {
            return super.off(event, listener);
        }
    }
}

export { View };
