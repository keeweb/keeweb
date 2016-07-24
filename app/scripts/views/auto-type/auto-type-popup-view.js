'use strict';

const Backbone = require('backbone');
const Launcher = require('../../comp/launcher');
const Locale = require('../../util/locale');
const ThemeChanger = require('../../util/theme-changer');
const Keys = require('../../const/keys');
const AppSettingsModel = require('../../models/app-settings-model');

class AutoTypePopupView {
    constructor() {
        this.template = require('templates/auto-type/popup.hbs');
        this.popupWindow = null;
        this.result = null;
    }

    render() {
        let themeClass = ThemeChanger.getThemeClass(AppSettingsModel.instance.get('theme'));
        let styleSheet = document.styleSheets[0];
        let css = styleSheet.ownerNode.textContent;
        if (!css) {
            // dev mode, external stylesheet
            css = _.map(styleSheet.rules, rule => rule.cssText).join('\n');
        }
        let html = this.template({
            themeClass: themeClass,
            css: css
        });

        this.popupWindow = Launcher.openWindow({
            show: false,
            width: 600,
            minWidth: 600,
            height: 300,
            minHeight: 300,
            minimizable: false,
            maximizable: false,
            alwaysOnTop: true,
            fullscreenable: false,
            title: Locale.autoTypePopup,
            modal: true
            // icon: TODO
        });
        this.popupWindow.on('closed', () => this.remove());
        this.popupWindow.on('blur', () => this.popupWindow.close());
        this.popupWindow.on('ready-to-show', () => this.popupWindow.show());
        this.popupWindow.loadURL('data:text/html;charset=utf-8,' + encodeURI(html));
        this.popupWindow.webContents.executeJavaScript('(' + this.init.toString() + ')()');

        Backbone.on('auto-type-popup-keydown', e => this.keydown(e));
        Backbone.on('auto-type-popup-keypress', e => this.keypress(e));
        Backbone.on('auto-type-popup-select', e => this.select(e));

        return this;
    }

    remove() {
        if (this.popupWindow) {
            this.popupWindow = null;
            Backbone.off('auto-type-popup-keydown');
            Backbone.off('auto-type-popup-keypress');
            Backbone.off('auto-type-popup-select');
            this.trigger('closed', { result: this.result });
        }
    }

    init() {
        // note: this function will be executed in popup
        function emitBackboneEvent(name, arg) {
            window.require('electron').remote.app.emitBackboneEvent('auto-type-popup-' + name, arg);
        }
        document.body.addEventListener('keydown', e => {
            emitBackboneEvent('keydown', {keyCode: e.keyCode});
        });
        document.body.addEventListener('keypress', e => {
            emitBackboneEvent('keypress', {keyCode: e.keyCode, text: e.key});
        });
    }

    keydown(e) {
        if (e.keyCode === Keys.DOM_VK_ESCAPE) {
            return this.popupWindow.close();
        } else if (e.keyCode === Keys.DOM_VK_ENTER || e.keyCode === Keys.DOM_VK_RETURN) {
            this.result = 'entry';
            return this.popupWindow.close();
        }
    }

    keypress(e) {
        // TODO
    }

    select(e) {
        this.result = e.result;
    }
}

_.extend(AutoTypePopupView.prototype, Backbone.Events);

module.exports = AutoTypePopupView;
