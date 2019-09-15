import { Launcher } from 'comp/launcher';

const RuntimeInfo = {
    version: '@@VERSION',
    beta: !!'@@BETA',
    buildDate: '@@DATE',
    commit: '@@COMMIT',
    userAgent: navigator.userAgent,
    launcher: Launcher ? Launcher.name + ' v' + Launcher.version : ''
};

export { RuntimeInfo };
