import { Events } from 'framework/events';
import { AutoTypeFilter } from 'auto-type/auto-type-filter';
import { AutoTypeHelperFactory } from 'auto-type/auto-type-helper-factory';
import { AutoTypeParser } from 'auto-type/auto-type-parser';
import { Launcher } from 'comp/launcher';
import { Alerts } from 'comp/ui/alerts';
import { Timeouts } from 'const/timeouts';
import { AppSettingsModel } from 'models/app-settings-model';
import { AppModel } from 'models/app-model';
import { Locale } from 'util/locale';
import { Logger } from 'util/logger';
import { AutoTypeSelectView } from 'views/auto-type/auto-type-select-view';

const logger = new Logger('auto-type');
const clearTextAutoTypeLog = !!localStorage.debugAutoType;

const AutoType = {
    helper: AutoTypeHelperFactory.create(),
    enabled: !!(Launcher && Launcher.autoTypeSupported),
    supportsEventsWithWindowId: !!(Launcher && Launcher.platform() === 'linux'),
    selectEntryView: false,
    pendingEvent: null,
    running: false,

    init() {
        if (!this.enabled) {
            return;
        }
        Events.on('auto-type', (e) => this.handleEvent(e));
        Events.on('main-window-blur', (e) => this.mainWindowBlur(e));
        Events.on('main-window-focus', (e) => this.mainWindowFocus(e));
        Events.on('main-window-will-close', (e) => this.mainWindowWillClose(e));
        Events.on('closed-open-view', (e) => this.processPendingEvent(e));
    },

    handleEvent(e) {
        const entry = (e && e.entry) || null;
        const sequence = (e && e.sequence) || null;
        const context = (e && e.context) || null;
        logger.debug('Auto type event', entry);
        if (this.running) {
            logger.debug('Already running, skipping event');
            return;
        }
        if (entry) {
            this.hideWindow(() => {
                this.runAndHandleResult({ entry, sequence, context });
            });
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

    runAndHandleResult(result, windowId) {
        this.run(result, windowId, (err) => {
            if (err) {
                Alerts.error({
                    header: Locale.autoTypeError,
                    body: Locale.autoTypeErrorGeneric.replace('{}', err.toString())
                });
            }
        });

        if (AppSettingsModel.lockOnAutoType) {
            Events.emit('lock-workspace');
        }
    },

    run(result, windowId, callback) {
        this.running = true;
        const sequence = result.sequence || result.entry.getEffectiveAutoTypeSeq();
        const context = result.context;
        logger.debug('Start', sequence);
        const ts = logger.ts();
        try {
            const parser = new AutoTypeParser(sequence);
            const runner = parser.parse();
            logger.debug('Parsed', this.printOps(runner.ops));
            runner.resolve(result.entry, context, (err) => {
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
                runner.run((err) => {
                    this.running = false;
                    if (err) {
                        logger.error('Run error', err);
                        return callback && callback(err);
                    }
                    logger.debug('Complete', logger.ts(ts));
                    return callback && callback();
                }, windowId);
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
            runner.resolve(entry, null, callback);
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

    getActiveWindowInfo(callback) {
        logger.debug('Getting window info');
        return this.helper.getActiveWindowInfo((err, windowInfo) => {
            if (err) {
                logger.error('Error getting window info', err);
            } else {
                if (!windowInfo.url) {
                    // try to find a URL in the title
                    const urlMatcher = new RegExp(
                        'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,4}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)'
                    );
                    const urlMatches = urlMatcher.exec(windowInfo.title);
                    windowInfo.url = urlMatches && urlMatches.length > 0 ? urlMatches[0] : null;
                }
                logger.debug('Window info', windowInfo.id, windowInfo.title, windowInfo.url);
            }
            return callback(err, windowInfo);
        });
    },

    activeWindowMatches(windowInfo, callback) {
        if (!windowInfo || !windowInfo.id) {
            logger.debug('Skipped active window check because window id is unknown');
            return callback(true);
        }
        this.getActiveWindowInfo((err, activeWindowInfo) => {
            if (!activeWindowInfo) {
                logger.debug('Error during active window check, something is wrong', err);
                return callback(false);
            }
            if (activeWindowInfo.id !== windowInfo.id && !this.supportsEventsWithWindowId) {
                logger.info(
                    `Active window doesn't match: ID is different. ` +
                        `Expected ${windowInfo.id}, got ${activeWindowInfo.id}`
                );
                return callback(false, activeWindowInfo);
            }
            if (activeWindowInfo.url !== windowInfo.url && !this.supportsEventsWithWindowId) {
                logger.info(
                    `Active window doesn't match: url is different. ` +
                        `Expected "${windowInfo.url}", got "${activeWindowInfo.url}"`
                );
                return callback(false, activeWindowInfo);
            }
            logger.info('Active window matches');
            callback(true, activeWindowInfo);
        });
    },

    selectEntryAndRun() {
        this.getActiveWindowInfo((e, windowInfo) => {
            const filter = new AutoTypeFilter(windowInfo, AppModel.instance);
            const evt = { filter, windowInfo };
            if (!AppModel.instance.files.hasOpenFiles()) {
                this.pendingEvent = evt;
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
        if (entries.length === 1 && AppSettingsModel.directAutotype) {
            this.hideWindow(() => {
                this.runAndHandleResult({ entry: entries[0] }, evt.windowInfo.id);
            });
            return;
        }
        this.focusMainWindow();
        evt.filter.ignoreWindowInfo = true;
        this.selectEntryView = new AutoTypeSelectView({ filter: evt.filter });
        this.selectEntryView.on('result', (result) => {
            logger.debug('Entry selected', result);
            this.selectEntryView.off('result');
            this.selectEntryView.remove();
            this.selectEntryView = null;
            this.hideWindow(() => {
                if (result) {
                    this.activeWindowMatches(evt.windowInfo, (matches, activeWindowInfo) => {
                        if (matches) {
                            this.runAndHandleResult(result, evt.windowInfo.id);
                        }
                    });
                }
            });
        });
        this.selectEntryView.render();
        this.selectEntryView.on('show-open-files', () => {
            this.selectEntryView.hide();
            Events.emit('open-file');
        });
    },

    mainWindowBlur() {
        this.mainWindowBlurTimer = setTimeout(() => {
            // macOS emits focus-blur-focus event in a row when triggering auto-type from minimized state
            delete this.mainWindowBlurTimer;
            this.resetPendingEvent();
            if (this.selectEntryView) {
                this.selectEntryView.emit('result', undefined);
            }
        }, Timeouts.AutoTypeWindowFocusAfterBlur);
    },

    mainWindowFocus() {
        if (this.mainWindowBlurTimer) {
            clearTimeout(this.mainWindowBlurTimer);
            this.mainWindowBlurTimer = null;
        }
    },

    mainWindowWillClose() {
        this.resetPendingEvent();
        if (this.selectEntryView) {
            this.selectEntryView.emit('result', undefined);
        }
    },

    resetPendingEvent() {
        if (this.pendingEvent) {
            this.pendingEvent = null;
            logger.debug('auto-type event canceled');
        }
    },

    processPendingEvent() {
        if (this.selectEntryView) {
            this.selectEntryView.show();
        }
        if (!this.pendingEvent) {
            return;
        }
        logger.debug('processing pending auto-type event');
        const evt = this.pendingEvent;
        this.pendingEvent = null;
        this.processEventWithFilter(evt);
    }
};

export { AutoType };
