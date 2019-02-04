const Backbone = require('backbone');
const AutoTypeParser = require('./auto-type-parser');
const AutoTypeFilter = require('./auto-type-filter');
const AutoTypeHelperFactory = require('./auto-type-helper-factory');
const Launcher = require('../comp/launcher');
const Alerts = require('../comp/alerts');
const AutoTypeSelectView = require('../views/auto-type/auto-type-select-view');
const Logger = require('../util/logger');
const Locale = require('../util/locale');
const Timeouts = require('../const/timeouts');
const AppSettingsModel = require('../models/app-settings-model');
const AutoTypeSequenceType = require('../const/autotype-sequencetype');

const logger = new Logger('auto-type');
const clearTextAutoTypeLog = localStorage.autoTypeDebug;

const AutoType = {
    helper: AutoTypeHelperFactory.create(),
    enabled: !!(Launcher && Launcher.autoTypeSupported),
    selectEntryView: false,
    pendingEvent: null,
    running: false,

    init(appModel) {
        if (!this.enabled) {
            return;
        }
        this.appModel = appModel;
        Backbone.on('auto-type', this.handleEvent, this);
        Backbone.on('main-window-blur main-window-will-close', this.resetPendingEvent, this);
    },

    handleEvent(e) {
        const entry = e && e.entry || null;
        logger.debug('Auto type event', entry);
        if (this.running) {
            logger.debug('Already running, skipping event');
            return;
        }
        if (entry) {
            this.hideWindow(() => { this.runAndHandleResult({ entry }); });
        } else {
            if (this.selectEntryView) {
                return;
            }
            if (Launcher.isAppFocused()) {
                return Alerts.error({
                    header: Locale.autoTypeError,
                    body: Locale.autoTypeErrorGlobal,
                    skipIfAlertDisplayed: true
                });
            }
            this.selectEntryAndRun();
        }
    },

    runAndHandleResult(result) {
        this.run(result, err => {
            if (err) {
                Alerts.error({
                    header: Locale.autoTypeError,
                    body: Locale.autoTypeErrorGeneric.replace('{}', err.toString())
                });
            }
        });

        if (AppSettingsModel.instance.get('lockOnAutoType')) {
            Backbone.trigger('lock-workspace');
        }
    },

    run(result, callback) {
        this.running = true;
        let sequence;
        if (result.sequenceType === AutoTypeSequenceType.PASSWORD) {
            sequence = '{PASSWORD}';
        } else if (result.sequenceType === AutoTypeSequenceType.USERNAME) {
            sequence = '{USERNAME}';
        } else {
            sequence = result.entry.getEffectiveAutoTypeSeq();
        }
        logger.debug('Start', sequence);
        const ts = logger.ts();
        try {
            const parser = new AutoTypeParser(sequence);
            const runner = parser.parse();
            logger.debug('Parsed', this.printOps(runner.ops));
            runner.resolve(result.entry, err => {
                if (err) {
                    this.running = false;
                    logger.error('Resolve error', err);
                    return callback && callback(err);
                }
                logger.debug('Resolved', this.printOps(runner.ops));
                if (result.entry.autoTypeObfuscation) {
                    try {
                        runner.obfuscate();
                    } catch (e) {
                        this.running = false;
                        logger.error('Obfuscate error', e);
                        return callback && callback(e);
                    }
                    logger.debug('Obfuscated');
                }
                runner.run(err => {
                    this.running = false;
                    if (err) {
                        logger.error('Run error', err);
                        return callback && callback(err);
                    }
                    logger.debug('Complete', logger.ts(ts));
                    return callback && callback();
                });
            });
        } catch (ex) {
            this.running = false;
            logger.error('Parse error', ex);
            return callback && callback(ex);
        }
    },

    validate(entry, sequence, callback) {
        try {
            const parser = new AutoTypeParser(sequence);
            const runner = parser.parse();
            runner.resolve(entry, callback);
        } catch (ex) {
            return callback(ex);
        }
    },

    printOps(ops) {
        return '[' + ops.map(this.printOp, this).join(',') + ']';
    },

    printOp(op) {
        const mod = op.mod ? Object.keys(op.mod).join('') : '';
        if (op.type === 'group') {
            return mod + this.printOps(op.value);
        }
        if (op.type === 'text') {
            let value = op.value;
            if (!clearTextAutoTypeLog) {
                value = value.replace(/./g, '*');
            }
            return mod + value;
        }
        return mod + op.type + ':' + op.value;
    },

    hideWindow(callback) {
        logger.debug('Hide window');
        if (Launcher.isAppFocused()) {
            Launcher.hideApp();
            setTimeout(callback, Timeouts.AutoTypeAfterHide);
        } else {
            callback();
        }
    },

    getActiveWindowTitle(callback) {
        logger.debug('Get window title');
        return this.helper.getActiveWindowTitle((err, title, url) => {
            if (err) {
                logger.error('Error get window title', err);
            } else {
                if (!url) {
                    // try to find a URL in the title
                    const urlMatcher = new RegExp(
                        'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,4}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)'
                    );
                    const urlMatches = urlMatcher.exec(title);
                    url = urlMatches && urlMatches.length > 0 ? urlMatches[0] : null;
                }
                logger.debug('Window title', title, url);
            }
            return callback(err, title, url);
        });
    },

    selectEntryAndRun() {
        this.getActiveWindowTitle((e, title, url) => {
            const filter = new AutoTypeFilter({title, url}, this.appModel);
            const evt = { filter };
            if (!this.appModel.files.hasOpenFiles()) {
                this.pendingEvent = evt;
                this.appModel.files.once('update', this.processPendingEvent, this);
                logger.debug('auto-type event delayed');
                this.focusMainWindow();
            } else {
                this.processEventWithFilter(evt);
            }
        });
    },

    focusMainWindow() {
        setTimeout(() => Launcher.showMainWindow(), Timeouts.RedrawInactiveWindow);
    },

    processEventWithFilter(evt) {
        const entries = evt.filter.getEntries();
        if (entries.length === 1) {
            this.hideWindow(() => {
                this.runAndHandleResult({ entry: entries.at(0) });
            });
            return;
        }
        this.focusMainWindow();
        evt.filter.ignoreWindowInfo = true;
        this.selectEntryView = new AutoTypeSelectView({
            model: { filter: evt.filter }
        }).render();
        this.selectEntryView.on('result', result => {
            logger.debug('Entry selected', result);
            this.selectEntryView.off('result');
            this.selectEntryView.remove();
            this.selectEntryView = null;
            this.hideWindow(() => {
                if (result) {
                    this.runAndHandleResult(result);
                }
            });
        });
    },

    resetPendingEvent() {
        if (this.pendingEvent) {
            this.pendingEvent = null;
            this.appModel.files.off('update', this.processPendingEvent, this);
            logger.debug('auto-type event cancelled');
        }
    },

    processPendingEvent() {
        if (!this.pendingEvent) {
            return;
        }
        logger.debug('processing pending auto-type event');
        const evt = this.pendingEvent;
        this.appModel.files.off('update', this.processPendingEvent, this);
        this.pendingEvent = null;
        this.processEventWithFilter(evt);
    }
};

module.exports = AutoType;
