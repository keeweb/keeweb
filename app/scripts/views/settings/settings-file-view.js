import * as kdbxweb from 'kdbxweb';
import { View } from 'framework/views/view';
import { Storage } from 'storage';
import { Shortcuts } from 'comp/app/shortcuts';
import { Launcher } from 'comp/launcher';
import { Alerts } from 'comp/ui/alerts';
import { YubiKey } from 'comp/app/yubikey';
import { UsbListener } from 'comp/app/usb-listener';
import { Links } from 'const/links';
import { AppSettingsModel } from 'models/app-settings-model';
import { DateFormat } from 'comp/i18n/date-format';
import { UrlFormat } from 'util/formatting/url-format';
import { PasswordPresenter } from 'util/formatting/password-presenter';
import { Locale } from 'util/locale';
import { Features } from 'util/features';
import { FileSaver } from 'util/ui/file-saver';
import { OpenConfigView } from 'views/open-config-view';
import { omit } from 'util/fn';
import template from 'templates/settings/settings-file.hbs';

const DefaultBackupPath = 'Backups/{name}.{date}.bak';
const DefaultBackupSchedule = '1w';

class SettingsFileView extends View {
    template = template;
    yubiKeys = [];

    events = {
        'click .settings__file-button-save-default': 'saveDefault',
        'click .settings__file-button-save-choose': 'toggleChooser',
        'click .settings__file-button-close': 'closeFile',
        'click .settings__file-save-to-file': 'saveToFile',
        'click .settings__file-save-to-xml': 'saveToXml',
        'click .settings__file-save-to-html': 'saveToHtml',
        'click .settings__file-save-to-storage': 'saveToStorage',
        'change #settings__file-key-file': 'keyFileChange',
        'click #settings__file-file-select-link': 'triggerSelectFile',
        'change #settings__file-file-select': 'fileSelected',
        'focus #settings__file-master-pass': 'focusMasterPass',
        'input #settings__file-master-pass': 'changeMasterPass',
        'blur #settings__file-master-pass': 'blurMasterPass',
        'focus #settings__file-confirm-master-pass': 'focusConfirmMasterPass',
        'blur #settings__file-confirm-master-pass': 'blurConfirmMasterPass',
        'input #settings__file-name': 'changeName',
        'input #settings__file-def-user': 'changeDefUser',
        'change #settings__file-backup-enabled': 'changeBackupEnabled',
        'input #settings__file-backup-path': 'changeBackupPath',
        'change #settings__file-backup-storage': 'changeBackupStorage',
        'change #settings__file-backup-schedule': 'changeBackupSchedule',
        'click .settings__file-button-backup': 'backupFile',
        'change #settings__file-trash': 'changeTrash',
        'change #settings__file-hist-type': 'changeHistoryMode',
        'input #settings__file-hist-len': 'changeHistoryLength',
        'input #settings__file-hist-size': 'changeHistorySize',
        'change #settings__file-format-version': 'changeFormatVersion',
        'change #settings__file-kdf': 'changeKdf',
        'input #settings__file-key-rounds': 'changeKeyRounds',
        'input #settings__file-key-change-force': 'changeKeyChangeForce',
        'input .settings__input-kdf': 'changeKdfParameter',
        'change #settings__file-yubikey': 'changeYubiKey'
    };

    constructor(model, options) {
        super(model, options);
        const watchedProps = ['syncing', 'syncError', 'syncDate'];
        for (const prop of watchedProps) {
            this.listenTo(this.model, 'change:' + prop, () => {
                setTimeout(() => this.render(), 0);
            });
        }

        this.refreshYubiKeys(false);
    }

    render() {
        const storageProviders = [];
        const fileStorage = this.model.storage;
        let canBackup = false;
        Object.keys(Storage).forEach((name) => {
            const prv = Storage[name];
            if (!canBackup && prv.backup && prv.enabled) {
                canBackup = true;
            }
            if (!prv.system && prv.enabled) {
                storageProviders.push({
                    name: prv.name,
                    icon: prv.icon,
                    own: name === fileStorage,
                    backup: prv.backup
                });
            }
        });
        storageProviders.sort((x, y) => (x.uipos || Infinity) - (y.uipos || Infinity));
        const backup = this.model.backup;

        const selectedYubiKey = this.model.chalResp
            ? `${this.model.chalResp.serial}:${this.model.chalResp.slot}`
            : '';
        const showYubiKeyBlock =
            !!this.model.chalResp ||
            (Launcher && AppSettingsModel.enableUsb && AppSettingsModel.yubiKeyShowChalResp);
        const yubiKeys = [];
        if (showYubiKeyBlock) {
            for (const yk of this.yubiKeys) {
                for (const slot of yk.slots.filter((s) => s.valid)) {
                    yubiKeys.push({
                        value: `${yk.serial}:${slot.number}`,
                        fullName: yk.fullName,
                        vid: yk.vid,
                        pid: yk.pid,
                        serial: yk.serial,
                        slot: slot.number
                    });
                }
            }
            if (selectedYubiKey && !yubiKeys.some((yk) => yk.value === selectedYubiKey)) {
                yubiKeys.push({
                    value: selectedYubiKey,
                    fullName: `YubiKey ${this.model.chalResp.serial}`,
                    vid: this.model.chalResp.vid,
                    pid: this.model.chalResp.pid,
                    serial: this.model.chalResp.serial,
                    slot: this.model.chalResp.slot
                });
            }
        }

        super.render({
            cmd: Shortcuts.actionShortcutSymbol(true),
            supportFiles: !!Launcher,
            desktopLink: Links.Desktop,
            name: this.model.name,
            path: this.model.path,
            storage: this.model.storage,
            syncing: this.model.syncing,
            syncError: this.model.syncError,
            syncDate: DateFormat.dtStr(this.model.syncDate),
            password: PasswordPresenter.present(this.model.passwordLength),
            defaultUser: this.model.defaultUser,
            recycleBinEnabled: this.model.recycleBinEnabled,
            backupEnabled: backup && backup.enabled,
            backupStorage: backup && backup.storage,
            backupPath:
                (backup && backup.path) || DefaultBackupPath.replace('{name}', this.model.name),
            backupSchedule: backup ? backup.schedule : DefaultBackupSchedule,
            historyMaxItems: this.model.historyMaxItems,
            historyMaxSize: Math.round(this.model.historyMaxSize / 1024 / 1024),
            formatVersion: this.model.formatVersion,
            kdfName: this.model.kdfName,
            isArgon2Kdf: this.model.kdfName.startsWith('Argon2'),
            keyEncryptionRounds: this.model.keyEncryptionRounds,
            keyChangeForce: this.model.keyChangeForce > 0 ? this.model.keyChangeForce : null,
            kdfParameters: this.kdfParametersToUi(this.model.kdfParameters),
            storageProviders,
            canBackup,
            canSaveTo: AppSettingsModel.canSaveTo,
            canExportXml: AppSettingsModel.canExportXml,
            canExportHtml: AppSettingsModel.canExportHtml,
            showYubiKeyBlock,
            selectedYubiKey,
            yubiKeys
        });
        if (!this.model.created) {
            this.$el.find('.settings__file-master-pass-warning').toggle(this.model.passwordChanged);
            this.$el
                .find('#settings__file-master-pass-warning-text')
                .text(Locale.setFilePassChanged);
        }
        this.renderKeyFileSelect();
    }

    kdfParametersToUi(kdfParameters) {
        return kdfParameters
            ? { ...kdfParameters, memory: Math.round(kdfParameters.memory / 1024) }
            : null;
    }

    renderKeyFileSelect() {
        const keyFileName = this.model.keyFileName;
        const oldKeyFileName = this.model.oldKeyFileName;
        const keyFileChanged = this.model.keyFileChanged;
        const sel = this.$el.find('#settings__file-key-file');
        sel.empty();
        if (keyFileName && keyFileChanged) {
            const text =
                keyFileName !== 'Generated'
                    ? Locale.setFileUseKeyFile + ' ' + keyFileName
                    : Locale.setFileUseGenKeyFile;
            $('<option/>').val('ex').text(text).appendTo(sel);
        }
        if (oldKeyFileName) {
            const useText = keyFileChanged
                ? Locale.setFileUseOldKeyFile
                : Locale.setFileUseKeyFile + ' ' + oldKeyFileName;
            $('<option/>').val('old').text(useText).appendTo(sel);
        }
        $('<option/>').val('gen').text(Locale.setFileGenKeyFile).appendTo(sel);
        $('<option/>').val('none').text(Locale.setFileDontUseKeyFile).appendTo(sel);
        if (keyFileName && keyFileChanged) {
            sel.val('ex');
        } else if (!keyFileName) {
            sel.val('none');
        } else if (oldKeyFileName && keyFileName === oldKeyFileName && !keyFileChanged) {
            sel.val('old');
        }
    }

    validatePassword(continueCallback) {
        if (!this.model.passwordLength) {
            Alerts.yesno({
                header: Locale.setFileEmptyPass,
                body: Locale.setFileEmptyPassBody,
                success: () => {
                    continueCallback();
                },
                cancel: () => {
                    this.$el.find('#settings__file-master-pass').focus();
                }
            });
            return false;
        }
        return true;
    }

    save(arg) {
        if (!arg) {
            arg = {};
        }
        arg.startedByUser = true;
        if (!arg.skipValidation) {
            const isValid = this.validatePassword(() => {
                arg.skipValidation = true;
                this.save(arg);
            });
            if (!isValid) {
                return;
            }
        }

        this.appModel.syncFile(this.model, arg);
    }

    saveDefault() {
        this.save();
    }

    toggleChooser() {
        this.$el.find('.settings__file-save-choose').toggleClass('hide');
    }

    saveToFile(skipValidation) {
        if (skipValidation !== true && !this.validatePassword(this.saveToFile.bind(this, true))) {
            return;
        }
        const fileName = this.model.name + '.kdbx';
        if (Launcher && !this.model.storage) {
            Launcher.getSaveFileName(fileName, (path) => {
                if (path) {
                    this.save({ storage: 'file', path });
                }
            });
        } else {
            this.model.getData((data) => {
                if (!data) {
                    return;
                }
                if (Launcher) {
                    Launcher.getSaveFileName(fileName, (path) => {
                        if (path) {
                            Storage.file.save(path, null, data, (err) => {
                                if (err) {
                                    Alerts.error({
                                        header: Locale.setFileSaveError,
                                        body: Locale.setFileSaveErrorBody + ' ' + path + ':',
                                        pre: err
                                    });
                                }
                            });
                        }
                    });
                } else {
                    const blob = new Blob([data], { type: 'application/octet-stream' });
                    FileSaver.saveAs(blob, fileName);
                }
            });
        }
    }

    saveToXml() {
        Alerts.yesno({
            header: Locale.setFileExportRaw,
            body: Locale.setFileExportRawBody,
            success: () => {
                this.model.getXml((xml) => {
                    const blob = new Blob([xml], { type: 'text/xml' });
                    FileSaver.saveAs(blob, this.model.name + '.xml');
                });
            }
        });
    }

    saveToHtml() {
        Alerts.yesno({
            header: Locale.setFileExportRaw,
            body: Locale.setFileExportRawBody,
            success: () => {
                this.model.getHtml((html) => {
                    const blob = new Blob([html], { type: 'text/html' });
                    FileSaver.saveAs(blob, this.model.name + '.html');
                });
            }
        });
    }

    saveToStorage(e) {
        if (this.model.syncing || this.model.demo) {
            return;
        }
        const storageName = $(e.target).closest('.settings__file-save-to-storage').data('storage');
        const storage = Storage[storageName];
        if (!storage) {
            return;
        }
        if (this.model.storage === storageName) {
            this.save();
        } else {
            if (!storage.list) {
                if (storage.getOpenConfig) {
                    const config = {
                        id: storage.name,
                        name: Locale[storage.name] || storage.name,
                        icon: storage.icon,
                        buttons: false,
                        ...storage.getOpenConfig()
                    };
                    const openConfigView = new OpenConfigView(config);
                    Alerts.alert({
                        header: '',
                        body: '',
                        icon: storage.icon || 'file-lines',
                        buttons: [Alerts.buttons.ok, Alerts.buttons.cancel],
                        esc: '',
                        opaque: true,
                        view: openConfigView,
                        success: () => {
                            const storageConfig = openConfigView.getData();
                            if (!storageConfig) {
                                return;
                            }
                            const opts = omit(storageConfig, ['path', 'storage']);
                            if (opts && Object.keys(opts).length) {
                                this.model.opts = opts;
                            }
                            this.save({ storage: storageName, path: storageConfig.path, opts });
                        }
                    });
                } else {
                    Alerts.notImplemented();
                }
                return;
            }
            this.model.syncing = true;
            storage.list('', (err, files) => {
                this.model.syncing = false;
                if (err) {
                    return;
                }
                const expName = this.model.name.toLowerCase();
                const existingFile = [...files].find(
                    (file) =>
                        !file.dir && UrlFormat.getDataFileName(file.name).toLowerCase() === expName
                );
                if (existingFile) {
                    Alerts.yesno({
                        header: Locale.setFileAlreadyExists,
                        body: Locale.setFileAlreadyExistsBody.replace('{}', this.model.name),
                        success: () => {
                            this.model.syncing = true;
                            storage.remove(existingFile.path, (err) => {
                                this.model.syncing = false;
                                if (!err) {
                                    this.save({ storage: storageName });
                                }
                            });
                        }
                    });
                } else {
                    this.save({ storage: storageName });
                }
            });
        }
    }

    closeFile() {
        if (this.model.modified) {
            Alerts.yesno({
                header: Locale.setFileUnsaved,
                body: Locale.setFileUnsavedBody,
                buttons: [
                    { result: 'close', title: Locale.setFileCloseNoSave, error: true },
                    { result: '', title: Locale.setFileDontClose }
                ],
                success: (result) => {
                    if (result === 'close') {
                        this.closeFileNoCheck();
                    }
                }
            });
        } else {
            this.closeFileNoCheck();
        }
    }

    closeFileNoCheck() {
        this.appModel.closeFile(this.model);
    }

    keyFileChange(e) {
        switch (e.target.value) {
            case 'old':
                this.selectOldKeyFile();
                break;
            case 'gen':
                this.generateKeyFile();
                break;
            case 'none':
                this.clearKeyFile();
                break;
        }
    }

    selectOldKeyFile() {
        this.model.resetKeyFile();
        this.renderKeyFileSelect();
    }

    generateKeyFile() {
        this.model.generateAndSetKeyFile().then((keyFile) => {
            const blob = new Blob([keyFile], { type: 'application/octet-stream' });
            FileSaver.saveAs(blob, this.model.name + '.key');
            this.renderKeyFileSelect();
        });
    }

    clearKeyFile() {
        this.model.removeKeyFile();
        this.renderKeyFileSelect();
    }

    triggerSelectFile() {
        this.$el.find('#settings__file-file-select').click();
    }

    fileSelected(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const res = e.target.result;
            this.model.setKeyFile(res, file.name);
            this.renderKeyFileSelect();
        };
        reader.readAsArrayBuffer(file);
    }

    focusMasterPass(e) {
        e.target.value = '';
        e.target.setAttribute('type', 'text');
        this.model.passwordChanged = false;
    }

    changeMasterPass(e) {
        if (!e.target.value) {
            this.model.resetPassword();
            this.$el.find('.settings__file-master-pass-warning').hide();
        } else {
            this.$el.find('#settings__file-confirm-master-pass-group').show();
            this.$el
                .find('#settings__file-master-pass-warning-text')
                .text(Locale.setFilePassChange);
            if (!this.model.created) {
                this.$el.find('.settings__file-master-pass-warning').show();
            }
        }
    }

    blurMasterPass(e) {
        if (!e.target.value) {
            this.model.resetPassword();
            this.resetConfirmMasterPass();
            e.target.value = PasswordPresenter.present(this.model.passwordLength);
            this.$el.find('.settings__file-master-pass-warning').hide();
        }
        e.target.setAttribute('type', 'password');
    }

    resetConfirmMasterPass() {
        this.$el.find('#settings__file-confirm-master-pass').val('');
        this.$el.find('#settings__file-confirm-master-pass-group').hide();
        this.$el.find('#settings__file-master-pass-warning-text').text(Locale.setFilePassChange);
    }

    focusConfirmMasterPass(e) {
        e.target.value = '';
        e.target.setAttribute('type', 'text');
    }

    blurConfirmMasterPass(e) {
        e.target.setAttribute('type', 'password');
        const masterPassword = this.$el.find('#settings__file-master-pass').val();
        const confirmPassword = e.target.value;
        if (masterPassword === confirmPassword) {
            this.$el
                .find('#settings__file-master-pass-warning-text')
                .text(Locale.setFilePassChanged);
            this.$el.find('.settings__file-confirm-master-pass-warning').hide();
            this.model.setPassword(kdbxweb.ProtectedValue.fromString(confirmPassword));
        } else {
            this.$el
                .find('#settings__file-master-pass-warning-text')
                .text(Locale.setFilePassChange);
            this.$el.find('.settings__file-confirm-master-pass-warning').show();
            this.model.resetPassword();
        }
    }

    changeName(e) {
        const value = $.trim(e.target.value);
        if (!value) {
            return;
        }
        this.model.setName(value);
    }

    changeDefUser(e) {
        const value = $.trim(e.target.value);
        this.model.setDefaultUser(value);
    }

    changeBackupEnabled(e) {
        const enabled = e.target.checked;
        let backup = this.model.backup;
        if (!backup) {
            backup = { enabled, schedule: DefaultBackupSchedule };
            const defaultPath = DefaultBackupPath.replace('{name}', this.model.name);
            if (Launcher) {
                backup.storage = 'file';
                backup.path = Launcher.getDocumentsPath(defaultPath);
            } else {
                backup.storage = 'dropbox';
                backup.path = defaultPath;
            }
            // } else if (this.model.storage === 'webdav') {
            //     backup.storage = 'webdav';
            //     backup.path = this.model.path + '.{date}.bak';
            // } else if (this.model.storage) {
            //     backup.storage = this.model.storage;
            //     backup.path = DefaultBackupPath.replace('{name}', this.model.name);
            // } else {
            //     Object.keys(Storage).forEach(name => {
            //         var prv = Storage[name];
            //         if (!backup.storage && !prv.system && prv.enabled) {
            //             backup.storage = name;
            //         }
            //     });
            //     if (!backup.storage) {
            //         e.target.checked = false;
            //         return;
            //     }
            //     backup.path = DefaultBackupPath.replace('{name}', this.model.name);
            // }
            this.$el.find('#settings__file-backup-storage').val(backup.storage);
            this.$el.find('#settings__file-backup-path').val(backup.path);
        }
        this.$el.find('.settings__file-backups').toggleClass('hide', !enabled);
        backup.enabled = enabled;
        this.setBackup(backup);
    }

    changeBackupPath(e) {
        const backup = this.model.backup;
        backup.path = e.target.value.trim();
        this.setBackup(backup);
    }

    changeBackupStorage(e) {
        const backup = this.model.backup;
        backup.storage = e.target.value;
        this.setBackup(backup);
    }

    changeBackupSchedule(e) {
        const backup = this.model.backup;
        backup.schedule = e.target.value;
        this.setBackup(backup);
    }

    setBackup(backup) {
        this.model.backup = backup;
        this.appModel.setFileBackup(this.model.id, backup);
    }

    backupFile() {
        if (this.backupInProgress) {
            return;
        }
        const backupButton = this.$el.find('.settings__file-button-backup');
        backupButton.text(Locale.setFileBackupNowWorking);
        this.model.getData((data) => {
            if (!data) {
                this.backupInProgress = false;
                backupButton.text(Locale.setFileBackupNow);
                return;
            }
            this.appModel.backupFile(this.model, data, (err) => {
                this.backupInProgress = false;
                backupButton.text(Locale.setFileBackupNow);
                if (err) {
                    let title = '';
                    let description = '';
                    if (err.isDir) {
                        title = Locale.setFileBackupErrorIsDir;
                        description = Locale.setFileBackupErrorIsDirDescription;
                    } else {
                        title = Locale.setFileBackupError;
                        description = Locale.setFileBackupErrorDescription;
                    }
                    Alerts.error({
                        title,
                        body: description,
                        pre: err.toString()
                    });
                }
            });
        });
    }

    changeTrash(e) {
        this.model.setRecycleBinEnabled(e.target.checked);
    }

    changeHistoryLength(e) {
        if (!e.target.validity.valid) {
            return;
        }
        const value = +e.target.value;
        if (isNaN(value)) {
            e.target.value = this.model.historyMaxItems;
            return;
        }
        this.model.setHistoryMaxItems(value);
    }

    changeHistoryMode(e) {
        let value = +e.target.value;
        if (value > 0) {
            value = 10;
        }
        this.model.setHistoryMaxItems(value);
        this.render();
    }

    changeHistorySize(e) {
        if (!e.target.validity.valid) {
            return;
        }
        const value = +e.target.value;
        if (isNaN(value)) {
            e.target.value = this.model.historyMaxSize / 1024 / 1024;
            return;
        }
        this.model.setHistoryMaxSize(value * 1024 * 1024);
    }

    changeFormatVersion(e) {
        const version = +e.target.value;
        this.model.setFormatVersion(version);
        this.render();
    }

    changeKdf(e) {
        this.model.setKdf(e.target.value);
        this.render();
    }

    changeKeyRounds(e) {
        if (!e.target.validity.valid) {
            return;
        }
        const value = +e.target.value;
        if (isNaN(value)) {
            e.target.value = this.model.keyEncryptionRounds;
            return;
        }
        this.model.setKeyEncryptionRounds(value);
    }

    changeKeyChangeForce(e) {
        if (!e.target.validity.valid) {
            return;
        }
        let value = Math.round(e.target.value);
        if (isNaN(value) || value <= 0) {
            value = -1;
        }
        this.model.setKeyChange(true, value);
    }

    changeKdfParameter(e) {
        if (!e.target.validity.valid) {
            return;
        }
        const field = $(e.target).data('field');
        const mul = $(e.target).data('mul') || 1;
        const value = e.target.value * mul;
        if (isNaN(value)) {
            e.target.value = Math.round(this.model.kdfParameters[field] / mul);
            return;
        }
        if (value > 0) {
            this.model.setKdfParameter(field, value);
        }
    }

    refreshYubiKeys(userInitiated) {
        if (!Launcher || !AppSettingsModel.enableUsb || !AppSettingsModel.yubiKeyShowChalResp) {
            return;
        }
        if (!UsbListener.attachedYubiKeys) {
            if (this.yubiKeys.length) {
                this.yubiKeys = [];
                this.render();
            }
        }
        YubiKey.list((err, yubiKeys) => {
            if (err || this.removed) {
                return;
            }
            this.yubiKeys = yubiKeys;
            this.render();
            if (
                userInitiated &&
                UsbListener.attachedYubiKeys &&
                !yubiKeys.length &&
                Features.isMac
            ) {
                Alerts.error({
                    body: Locale.setFileYubiKeyErrorEmptyMac
                });
            }
        });
    }

    changeYubiKey(e) {
        let chalResp = null;
        const value = e.target.value;
        if (value === 'refresh') {
            this.render();
            this.refreshYubiKeys(true);
            return;
        }
        if (value) {
            const option = e.target.selectedOptions[0];
            const vid = +option.dataset.vid;
            const pid = +option.dataset.pid;
            const serial = +option.dataset.serial;
            const slot = +option.dataset.slot;
            chalResp = { vid, pid, serial, slot };
        }
        Alerts.yesno({
            header: Locale.setFileYubiKeyHeader,
            body: Locale.setFileYubiKeyBody,
            success: () => {
                this.model.setChallengeResponse(chalResp);
            },
            cancel: () => {
                this.render();
            }
        });
    }
}

export { SettingsFileView };
