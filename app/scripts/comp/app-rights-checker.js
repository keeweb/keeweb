const FeatureDetector = require('../util/feature-detector');
const Alerts = require('../comp/alerts');
const AppSettingsModel = require('../models/app-settings-model');
const Launcher = require('./launcher');
const Locale = require('../util/locale');

const AppRightsChecker = {
    AppPath: '/Applications/KeeWeb.app',

    init() {
        if (!FeatureDetector.isDesktop || !FeatureDetector.isMac) {
            return;
        }
        if (AppSettingsModel.instance.get('skipFolderRightsWarning')) {
            return;
        }
        if (!Launcher.getAppPath().startsWith(this.AppPath)) {
            return;
        }
        this.needRunInstaller(needRun => {
            if (needRun) {
                this.showAlert();
                this.runInstaller();
            }
        });
    },

    needRunInstaller(callback) {
        Launcher.statFile(this.AppPath, stat => {
            const folderIsRoot = stat && stat.uid === 0;
            callback(!folderIsRoot);
        });
    },

    showAlert() {
        const command = 'sudo chown -R root ' + this.AppPath;
        this.alert = Alerts.alert({
            icon: 'lock',
            header: Locale.appRightsAlert,
            body: Locale.appRightsAlertBody1.replace('{}', `<code>${this.AppPath}</code>`) +
                '<br/>' + Locale.appRightsAlertBody2 + `: <pre>${command}</pre>`,
            buttons: [
                {result: 'skip', title: Locale.alertDoNotAsk, error: true},
                Alerts.buttons.ok
            ],
            success: (result) => {
                if (result === 'skip') {
                    this.dontAskAnymore();
                }
                this.alert = null;
            }
        });
    },

    runInstaller() {
        Launcher.spawn({
            cmd: this.AppPath + '/Contents/Installer/KeeWeb\ Installer.app/Contents/MacOS/applet',
            complete: () => {
                this.needRunInstaller(needRun => {
                    if (this.alert && !needRun) {
                        this.alert.closeWithResult('cancel');
                    }
                });
            }
        });
    },

    dontAskAnymore() {
        this.needRunInstaller(needRun => {
            if (needRun) {
                AppSettingsModel.instance.set('skipFolderRightsWarning', true);
            }
        });
    }
};

module.exports = AppRightsChecker;
