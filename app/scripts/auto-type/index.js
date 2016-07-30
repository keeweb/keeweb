'use strict';

var Backbone = require('backbone'),
    AutoTypeParser = require('./auto-type-parser'),
    AutoTypeFilter = require('./auto-type-filter'),
    AutoTypeHelperFactory = require('./auto-type-helper-factory'),
    Launcher = require('../comp/launcher'),
    Alerts = require('../comp/alerts'),
    AutoTypeSelectView = require('../views/auto-type/auto-type-select-view'),
    Logger = require('../util/logger'),
    Locale = require('../util/locale'),
    Timeouts = require('../const/timeouts');

var logger = new Logger('auto-type');
var clearTextAutoTypeLog = localStorage.autoTypeDebug;

var AutoType = {
    helper: AutoTypeHelperFactory.create(),
    enabled: !!Launcher,
    selectEntryView: false,

    init: function(appModel) {
        if (!this.enabled) {
            return;
        }
        this.appModel = appModel;
        Backbone.on('auto-type', this.handleEvent.bind(this));
    },

    handleEvent: function(e) {
        let entry = e && e.entry || null;
        logger.debug('Auto type event', entry);
        if (entry) {
            this.hideWindow(() => { this.runAndHandleResult(entry); });
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

    runAndHandleResult: function(entry) {
        this.run(entry, err => {
            if (err) {
                Alerts.error({
                    header: Locale.autoTypeError,
                    body: Locale.autoTypeErrorGeneric.replace('{}', err.toString())
                });
            }
        });
    },

    run: function(entry, callback) {
        var sequence = entry.getEffectiveAutoTypeSeq();
        logger.debug('Start', sequence);
        var ts = logger.ts();
        try {
            var parser = new AutoTypeParser(sequence);
            var runner = parser.parse();
            logger.debug('Parsed', this.printOps(runner.ops));
            runner.resolve(entry, err => {
                if (err) {
                    logger.error('Resolve error', err);
                    return callback && callback(err);
                }
                logger.debug('Resolved', this.printOps(runner.ops));
                if (entry.autoTypeObfuscation) {
                    try {
                        runner.obfuscate();
                    } catch (e) {
                        logger.error('Obfuscate error', e);
                        return callback && callback(e);
                    }
                    logger.debug('Obfuscated');
                }
                runner.run(err => {
                    if (err) {
                        logger.error('Run error', err);
                        return callback && callback(err);
                    }
                    logger.debug('Complete', logger.ts(ts));
                    return callback && callback();
                });
            });
        } catch (ex) {
            logger.error('Parse error', ex);
            return callback && callback(ex);
        }
    },

    validate: function(entry, sequence, callback) {
        try {
            var parser = new AutoTypeParser(sequence);
            var runner = parser.parse();
            runner.resolve(entry, callback);
        } catch (ex) {
            return callback(ex);
        }
    },

    printOps: function(ops) {
        return '[' + ops.map(this.printOp, this).join(',') + ']';
    },

    printOp: function(op) {
        var mod = op.mod ? Object.keys(op.mod).join('') : '';
        if (op.type === 'group') {
            return mod + this.printOps(op.value);
        }
        if (op.type === 'text') {
            var value = op.value;
            if (!clearTextAutoTypeLog) {
                value = value.replace(/./g, '*');
            }
            return mod + value;
        }
        return mod + op.type + ':' + op.value;
    },

    hideWindow: function(callback) {
        logger.debug('Hide window');
        if (Launcher.isAppFocused()) {
            Launcher.hideApp();
            setTimeout(callback, Timeouts.AutoTypeAfterHide);
        } else {
            callback();
        }
    },

    getActiveWindowTitle: function(callback) {
        logger.debug('Get window title');
        return this.helper.getActiveWindowTitle((err, title, url) => {
            if (err) {
                logger.error('Error get window title', err);
            } else {
                logger.debug('Window title', title, url);
            }
            return callback(err, title, url);
        });
    },

    selectEntryAndRun: function() {
        this.getActiveWindowTitle((e, title, url) => {
            let filter = new AutoTypeFilter({title, url}, this.appModel);
            let entries = filter.getEntries();
            if (entries.length === 1) {
                this.runAndHandleResult(entries[0]);
                return;
            }
            this.selectEntryView = new AutoTypeSelectView({
                model: {
                    filter: filter
                }
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
            setTimeout(() => Launcher.showMainWindow(), Timeouts.RedrawInactiveWindow);
        });
    }
};

module.exports = AutoType;
