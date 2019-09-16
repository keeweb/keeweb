import { View } from 'view-engine/view';
import { Shortcuts } from 'comp/app/shortcuts';
import { Launcher } from 'comp/launcher';
import { Keys } from 'const/keys';
import { Features } from 'util/features';
import { Locale } from 'util/locale';
import template from 'templates/settings/settings-shortcuts.hbs';

class SettingsShortcutsView extends View {
    template = template;

    systemShortcuts = [
        'Meta+A',
        'Alt+A',
        'Alt+C',
        'Alt+D',
        'Meta+F',
        'Meta+C',
        'Meta+B',
        'Meta+U',
        'Meta+T',
        'Alt+N',
        'Meta+O',
        'Meta+S',
        'Meta+G',
        'Meta+,',
        'Meta+L'
    ];

    events = {
        'click button.shortcut': 'shortcutClick'
    };

    render() {
        super.render({
            cmd: Shortcuts.actionShortcutSymbol(true),
            alt: Shortcuts.altShortcutSymbol(true),
            globalIsLarge: !Features.isMac,
            autoTypeSupported: !!Launcher,
            globalShortcuts: Launcher
                ? {
                      copyPassword: Shortcuts.globalShortcutText('copyPassword', true),
                      copyUser: Shortcuts.globalShortcutText('copyUser', true),
                      copyUrl: Shortcuts.globalShortcutText('copyUrl', true),
                      autoType: Shortcuts.globalShortcutText('autoType', true)
                  }
                : undefined
        });
    }

    shortcutClick(e) {
        const globalShortcutType = e.target.dataset.shortcut;

        const shortcutEditor = $('<div/>').addClass('shortcut__editor');
        $('<div/>')
            .text(Locale.setShEdit)
            .appendTo(shortcutEditor);
        const shortcutEditorInput = $('<input/>')
            .addClass('shortcut__editor-input')
            .val(Shortcuts.globalShortcutText(globalShortcutType))
            .appendTo(shortcutEditor);
        if (!Features.isMac) {
            shortcutEditorInput.addClass('shortcut__editor-input--large');
        }

        shortcutEditor.insertAfter($(e.target).parent());
        shortcutEditorInput.focus();
        shortcutEditorInput.on('blur', () => shortcutEditor.remove());
        shortcutEditorInput.on('keypress', e => e.preventDefault());
        shortcutEditorInput.on('keydown', e => {
            e.preventDefault();
            e.stopImmediatePropagation();

            if (e.which === Keys.DOM_VK_DELETE || e.which === Keys.DOM_VK_BACK_SPACE) {
                Shortcuts.setGlobalShortcut(globalShortcutType, undefined);
                this.render();
                return;
            }
            if (e.which === Keys.DOM_VK_ESCAPE) {
                shortcutEditorInput.blur();
                return;
            }

            const shortcut = Shortcuts.keyEventToShortcut(e);
            const presentableShortcutText = Shortcuts.presentShortcut(shortcut.value);

            shortcutEditorInput.val(presentableShortcutText);

            const exists = this.systemShortcuts.includes(shortcut.text);
            shortcutEditorInput.toggleClass('input--error', exists);

            const isValid = shortcut.valid && !exists;
            if (isValid) {
                Shortcuts.setGlobalShortcut(globalShortcutType, shortcut.value);
                this.render();
            }
        });
    }
}

export { SettingsShortcutsView };
