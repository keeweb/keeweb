import { Launcher } from 'comp/launcher';
import { Keys } from 'const/keys';
import { AppSettingsModel } from 'models/app-settings-model';
import { Features } from 'util/features';
import { StringFormat } from 'util/formatting/string-format';
import { Locale } from 'util/locale';

let allowedKeys;

function getAllowedKeys() {
    if (!allowedKeys) {
        allowedKeys = {};
        for (const [name, code] of Object.entries(Keys)) {
            const keyName = name.replace('DOM_VK_', '');
            if (/^([0-9A-Z]|F\d{1,2})$/.test(keyName)) {
                allowedKeys[code] = keyName;
            }
        }
    }
    return allowedKeys;
}

const globalShortcuts = {
    copyPassword: { mac: 'Ctrl+Alt+C', all: 'Shift+Alt+C' },
    copyUser: { mac: 'Ctrl+Alt+B', all: 'Shift+Alt+B' },
    copyUrl: { mac: 'Ctrl+Alt+U', all: 'Shift+Alt+U' },
    copyOtp: {},
    autoType: { mac: 'Ctrl+Alt+T', all: 'Shift+Alt+T' },
    restoreApp: {}
};

const Shortcuts = {
    keyEventToShortcut(event) {
        const modifiers = [];
        if (event.ctrlKey) {
            modifiers.push('Ctrl');
        }
        if (event.altKey) {
            modifiers.push('Alt');
        }
        if (event.shiftKey) {
            modifiers.push('Shift');
        }
        if (Features.isMac && event.metaKey) {
            modifiers.push('Meta');
        }
        const keyName = getAllowedKeys()[event.which];
        return {
            value: modifiers.join('+') + '+' + (keyName || '…'),
            valid: modifiers.length > 0 && !!keyName
        };
    },
    presentShortcut(shortcutValue, formatting) {
        if (!shortcutValue) {
            return '-';
        }
        return shortcutValue
            .split(/\+/g)
            .map((part) => {
                switch (part) {
                    case 'Ctrl':
                        return this.ctrlShortcutSymbol(formatting);
                    case 'Alt':
                        return this.altShortcutSymbol(formatting);
                    case 'Shift':
                        return this.shiftShortcutSymbol(formatting);
                    case 'Meta':
                        return this.actionShortcutSymbol(formatting);
                    default:
                        return part;
                }
            })
            .join('');
    },
    actionShortcutSymbol(formatting) {
        return Features.isMac ? '⌘' : this.formatShortcut(Locale.ctrlKey, formatting);
    },
    altShortcutSymbol(formatting) {
        return Features.isMac ? '⌥' : this.formatShortcut(Locale.altKey, formatting);
    },
    shiftShortcutSymbol(formatting) {
        return Features.isMac ? '⇧' : this.formatShortcut(Locale.shiftKey, formatting);
    },
    ctrlShortcutSymbol(formatting) {
        return Features.isMac ? '⌃' : this.formatShortcut(Locale.ctrlKey, formatting);
    },
    formatShortcut(shortcut, formatting) {
        return formatting ? `${shortcut} + ` : `${shortcut}+`;
    },
    globalShortcutText(type, formatting) {
        return this.presentShortcut(this.globalShortcut(type), formatting);
    },
    globalShortcut(type) {
        const appSettingsShortcut = AppSettingsModel[this.globalShortcutAppSettingsKey(type)];
        if (appSettingsShortcut) {
            return appSettingsShortcut;
        }
        const globalShortcut = globalShortcuts[type];
        if (globalShortcut) {
            if (Features.isMac && globalShortcut.mac) {
                return globalShortcut.mac;
            }
            return globalShortcut.all;
        }
        return undefined;
    },
    setGlobalShortcut(type, value) {
        if (!globalShortcuts[type]) {
            throw new Error('Bad shortcut: ' + type);
        }
        if (value) {
            AppSettingsModel[this.globalShortcutAppSettingsKey(type)] = value;
        } else {
            delete AppSettingsModel[this.globalShortcutAppSettingsKey(type)];
        }
        Launcher.setGlobalShortcuts(AppSettingsModel);
    },
    globalShortcutAppSettingsKey(type) {
        return 'globalShortcut' + StringFormat.capFirst(type);
    },
    screenshotToClipboardShortcut() {
        if (Features.isiOS) {
            return 'Sleep+Home';
        }
        if (Features.isMobile) {
            return '';
        }
        if (Features.isMac) {
            return 'Command-Shift-Control-4';
        }
        if (Features.isWindows) {
            return 'Alt+PrintScreen';
        }
        return '';
    }
};

export { Shortcuts };
