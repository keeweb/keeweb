import { Events } from 'framework/events';
import { IdleTracker } from 'comp/browser/idle-tracker';
import { Keys } from 'const/keys';
import { FocusManager } from 'comp/app/focus-manager';

const shortcutKeyProp = navigator.platform.indexOf('Mac') >= 0 ? 'metaKey' : 'ctrlKey';

class KeyHandler {
    SHORTCUT_ACTION = 1;
    SHORTCUT_OPT = 2;
    SHORTCUT_SHIFT = 4;

    shortcuts = {};

    init() {
        $(document).bind('keypress', this.keypress.bind(this));
        $(document).bind('keydown', this.keydown.bind(this));

        this.shortcuts[Keys.DOM_VK_A] = [
            {
                handler: this.handleAKey,
                thisArg: this,
                shortcut: this.SHORTCUT_ACTION,
                modal: true,
                noPrevent: true
            }
        ];
    }

    onKey(key, handler, thisArg, shortcut, modal, noPrevent) {
        let keyShortcuts = this.shortcuts[key];
        if (!keyShortcuts) {
            this.shortcuts[key] = keyShortcuts = [];
        }
        keyShortcuts.push({
            handler,
            thisArg,
            shortcut,
            modal,
            noPrevent
        });
    }

    offKey(key, handler, thisArg) {
        if (this.shortcuts[key]) {
            this.shortcuts[key] = this.shortcuts[key].filter(
                (sh) => sh.handler !== handler || sh.thisArg !== thisArg
            );
        }
    }

    isActionKey(e) {
        return e[shortcutKeyProp];
    }

    keydown(e) {
        IdleTracker.regUserAction();
        const code = e.keyCode || e.which;
        const keyShortcuts = this.shortcuts[code];
        if (keyShortcuts && keyShortcuts.length) {
            for (const sh of keyShortcuts) {
                if (FocusManager.modal && sh.modal !== FocusManager.modal && sh.modal !== '*') {
                    e.stopPropagation();
                    continue;
                }
                const isActionKey = this.isActionKey(e);
                switch (sh.shortcut) {
                    case this.SHORTCUT_ACTION:
                        if (!isActionKey) {
                            continue;
                        }
                        break;
                    case this.SHORTCUT_OPT:
                        if (!e.altKey) {
                            continue;
                        }
                        break;
                    case this.SHORTCUT_SHIFT:
                        if (!e.shiftKey) {
                            continue;
                        }
                        break;
                    case this.SHORTCUT_ACTION + this.SHORTCUT_OPT:
                        if (!e.altKey || !isActionKey) {
                            continue;
                        }
                        break;
                    default:
                        if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
                            continue;
                        }
                        break;
                }
                sh.handler.call(sh.thisArg, e, code);
                if (isActionKey && !sh.noPrevent) {
                    e.preventDefault();
                }
                if (e.isImmediatePropagationStopped()) {
                    break;
                }
            }
        }
    }

    keypress(e) {
        if (
            !FocusManager.modal &&
            e.which !== Keys.DOM_VK_RETURN &&
            e.which !== Keys.DOM_VK_ESCAPE &&
            e.which !== Keys.DOM_VK_TAB &&
            !e.altKey &&
            !e.ctrlKey &&
            !e.metaKey
        ) {
            Events.emit('keypress', e);
        } else if (FocusManager.modal) {
            Events.emit('keypress:' + FocusManager.modal, e);
        }
    }

    reg() {
        IdleTracker.regUserAction();
    }

    handleAKey(e) {
        if (
            e.target.tagName.toLowerCase() === 'input' &&
            ['password', 'text'].indexOf(e.target.type) >= 0
        ) {
            e.stopImmediatePropagation();
        } else {
            e.preventDefault();
        }
    }
}

const instance = new KeyHandler();

export { instance as KeyHandler };
