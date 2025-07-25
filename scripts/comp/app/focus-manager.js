import { Logger } from 'util/logger';

const logger = new Logger(
    'focus-manager',
    undefined,
    localStorage.debugFocusManager ? Logger.Level.Debug : Logger.Level.Info
);

const FocusManager = {
    modal: null,

    setModal(modal) {
        this.modal = modal;
        logger.debug('Set modal', modal);
    }
};

export { FocusManager };
