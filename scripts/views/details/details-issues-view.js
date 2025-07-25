import { View } from 'framework/views/view';
import { Events } from 'framework/events';
import template from 'templates/details/details-issues.hbs';
import { Alerts } from 'comp/ui/alerts';
import { Timeouts } from 'const/timeouts';
import { Locale } from 'util/locale';
import { passwordStrength, PasswordStrengthLevel } from 'util/data/password-strength';
import { AppSettingsModel } from 'models/app-settings-model';
import { Links } from 'const/links';
import { checkIfPasswordIsExposedOnline } from 'comp/app/online-password-checker';

class DetailsIssuesView extends View {
    parent = '.details__issues-container';

    template = template;

    events = {
        'click .details__issues-close-btn': 'closeIssuesClick'
    };

    passwordIssue = null;

    constructor(model) {
        super(model);
        this.listenTo(AppSettingsModel, 'change', this.settingsChanged);
        if (AppSettingsModel.auditPasswords) {
            this.checkPasswordIssues();
        }
    }

    render(options) {
        if (!AppSettingsModel.auditPasswords) {
            super.render();
            return;
        }
        super.render({
            hibpLink: Links.HaveIBeenPwned,
            passwordIssue: this.passwordIssue,
            fadeIn: options?.fadeIn
        });
    }

    settingsChanged() {
        if (AppSettingsModel.auditPasswords) {
            this.checkPasswordIssues();
        }
        this.render();
    }

    passwordChanged() {
        const oldPasswordIssue = this.passwordIssue;
        this.checkPasswordIssues();
        if (oldPasswordIssue !== this.passwordIssue) {
            const fadeIn = !oldPasswordIssue;
            if (this.passwordIssue) {
                this.render({ fadeIn });
            } else {
                this.el.classList.add('fade-out');
                setTimeout(() => this.render(), Timeouts.FastAnimation);
            }
        }
    }

    checkPasswordIssues() {
        if (!this.model.canCheckPasswordIssues()) {
            this.passwordIssue = null;
            return;
        }
        const { password } = this.model;
        if (!password || !password.isProtected || !password.byteLength) {
            this.passwordIssue = null;
            return;
        }
        const auditEntropy = AppSettingsModel.auditPasswordEntropy;
        const strength = passwordStrength(password);
        if (AppSettingsModel.excludePinsFromAudit && strength.onlyDigits && strength.length <= 6) {
            this.passwordIssue = null;
        } else if (auditEntropy && strength.level < PasswordStrengthLevel.Low) {
            this.passwordIssue = 'poor';
        } else if (auditEntropy && strength.level < PasswordStrengthLevel.Good) {
            this.passwordIssue = 'weak';
        } else if (AppSettingsModel.auditPasswordAge && this.isOld()) {
            this.passwordIssue = 'old';
        } else {
            this.passwordIssue = null;
            this.checkOnHIBP();
        }
    }

    isOld() {
        if (!this.model.updated) {
            return false;
        }
        const dt = new Date(this.model.updated);
        dt.setFullYear(dt.getFullYear() + AppSettingsModel.auditPasswordAge);
        return dt < Date.now();
    }

    checkOnHIBP() {
        if (!AppSettingsModel.checkPasswordsOnHIBP) {
            return;
        }
        const isExposed = checkIfPasswordIsExposedOnline(this.model.password);
        if (typeof isExposed === 'boolean') {
            this.passwordIssue = isExposed ? 'pwned' : null;
        } else {
            const iconEl = this.el?.querySelector('.details__issues-icon');
            iconEl?.classList.add('details__issues-icon--loading');
            isExposed.then((isExposed) => {
                if (isExposed) {
                    this.passwordIssue = 'pwned';
                } else if (isExposed === false) {
                    if (this.passwordIssue === 'pwned') {
                        this.passwordIssue = null;
                    }
                } else {
                    this.passwordIssue = iconEl ? 'error' : null;
                }
                this.render();
            });
        }
    }

    closeIssuesClick() {
        Alerts.alert({
            header: Locale.detIssueCloseAlertHeader,
            body: Locale.detIssueCloseAlertBody,
            icon: 'exclamation-triangle',
            buttons: [
                { result: 'entry', title: Locale.detIssueCloseAlertEntry, silent: true },
                { result: 'settings', title: Locale.detIssueCloseAlertSettings, silent: true },
                Alerts.buttons.cancel
            ],
            esc: '',
            click: '',
            success: (result) => {
                switch (result) {
                    case 'entry':
                        this.disableAuditForEntry();
                        break;
                    case 'settings':
                        this.openAuditSettings();
                        break;
                }
            }
        });
    }

    disableAuditForEntry() {
        this.model.setIgnorePasswordIssues();
        this.checkPasswordIssues();
        this.render();
    }

    openAuditSettings() {
        Events.emit('toggle-settings', 'general', 'audit');
    }
}

export { DetailsIssuesView };
