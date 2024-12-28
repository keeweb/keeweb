const DefaultAppSettings = {
    allowIframes: false, // allow displaying the app in IFrames
    auditPasswordAge: 0, // show warnings about old passwords, number of years, 0 = disabled
    auditPasswordEntropy: true, // show warnings for weak passwords
    auditPasswords: true, // enable password audit
    autoSave: true, // auto-save open files
    autoSaveInterval: 0, // interval between performing automatic sync, minutes, -1: on every change
    autoSwitchTheme: false, // automatically switch between light and dark theme
    autoTypeTitleFilterEnabled: true, // enable the title filtering in auto-type by default
    autoUpdate: 'install', // auto-update options: "install", "check", ""
    backgroundId: 1, // interface background identifier
    backgroundOpacityDark: '0.8', // background opacity (dark themes), 0 - 1
    backgroundOpacityLight: '0.8', // background opacity (light themes), 0 - 1
    backgroundState: 'random', // interface backgrounds
    backgroundUrl: null, // interface background url
    cacheConfigSettings: false, // cache config settings and use them if the config can't be loaded
    checkPasswordsOnHIBP: false, // check passwords on Have I Been Pwned
    clipboardSeconds: 0, // number of seconds after which the clipboard will be cleared
    colorfulIcons: false, // use colorful custom icons instead of grayscale
    demoOpened: false, // hide the demo button inside the More... menu
    deviceOwnerAuth: null, // Touch ID: null / 'memory' / 'file'
    deviceOwnerAuthTimeoutMinutes: 0, // how often master password is required with Touch ID
    directAutotype: true, // if only one matching entry is found, select that one automatically
    disableOfflineStorage: false, // don't cache loaded files in offline storage
    enableFullPathStorage: false, // enable full path storage
    enableUsb: true, // enable interaction with USB devices
    excludePinsFromAudit: true, // exclude PIN codes from audit
    expandGroups: true, // show entries from all subgroups
    extensionFocusIfEmpty: true, // show the entry selection screen if there's no match found by URL
    extensionFocusIfLocked: true, // focus KeeWeb if a browser extension tries to connect while KeeWeb is locked
    fieldLabelDblClickAutoType: false, // trigger auto-type by doubleclicking field label
    fontSize: 1, // font size: 0, 1, 2, 3
    generatorHidePassword: false, // hide password in the generator
    generatorPresets: null, // presets used in the password generator
    generatorWordSeparator: ' ', // specifies the character to use as a separator in password generator
    helpTipCopyShown: false, // disable the tooltip about copying fields
    hideEmptyFields: false, // hide empty fields in entries
    idleMinutes: 15, // app lock timeout after inactivity, minutes
    idleWipeCredsMinutes: 1, // time until credentials wiped from vault login screen
    listViewWidth: null, // width of the entry list representation
    locale: null, // user interface language
    lockOnAutoType: false, // lock the app after performing auto-type
    lockOnCopy: false, // lock the app after a password was copied
    lockOnMinimize: true, // lock the app when it's minimized
    lockOnOsLock: false, // lock the app when the computer is locked
    menuViewWidth: null, // width of the left menu
    minimizeOnClose: false, // minimise the app instead of closing
    minimizeOnFieldCopy: false, // minimise the app on copy
    rememberKeyFiles: 'path', // remember keyfiles selected on the Open screen
    revealPassword: false, // reveal passwords when opening vault
    shortLivedStorageToken: false, // short-lived sessions in cloud storage providers
    skipHttpsWarning: false, // disable the non-HTTPS warning
    skipOpenLocalWarn: false, // disable the warning about opening a local file
    tableView: false, // view entries as a table instead of list
    tableViewColumns: null, // columns displayed in the table view
    tagsViewHeight: null, // tags menu section height
    templateHelpShown: false, // disable the tooltip about entry templates
    theme: null, // UI theme
    titlebarStyle: 'default', // window titlebar style
    useGroupIconForEntries: false, // automatically use group icon when creating new entries
    useMarkdown: true, // use Markdown in Notes field

    yubiKeyAutoOpen: false, // auto-load one-time codes when there are open files
    yubiKeyMatchEntries: true, // show matching one-time codes in entries
    yubiKeyRememberChalResp: false, // remember YubiKey challenge-response codes while the app is open
    yubiKeyShowChalResp: true, // show YubiKey challenge-response option
    yubiKeyShowIcon: true, // show an icon to open OTP codes from YubiKey
    yubiKeyStuckWorkaround: false, // enable the workaround for stuck YubiKeys

    canCreate: true, // can create new files
    canExportHtml: true, // can export files as HTML
    canExportXml: true, // can export files as XML
    canImportCsv: true, // can import files from CSV
    canImportXml: true, // can import files from XML
    canOpen: true, // can select and open new files
    canOpenDemo: true, // can open a demo file
    canOpenGenerator: true, // can open password generator
    canOpenOtpDevice: true, // can open OTP codes from USB tokens
    canOpenSettings: true, // can go to settings
    canOpenStorage: true, // can open files from cloud storage providers
    canRemoveLatest: true, // can remove files from the recent file list
    canSaveTo: true, // can save existing files to filesystem

    dropbox: true, // enable Dropbox integration
    dropboxAppKey: null, // custom Dropbox app key
    dropboxFolder: null, // default folder path
    dropboxSecret: null, // custom Dropbox app secret

    webdav: true, // enable WebDAV integration
    webdavSaveMethod: 'move', // how to save files with WebDAV: "move" or "put"
    webdavStatReload: false, // WebDAV: reload the file instead of relying on Last-Modified
    webdavAuthType: 'basic', // WebDAV authentication type: "basic" or "digest"

    gdrive: true, // enable Google Drive integration
    gdriveClientId: null, // custom Google Drive client id
    gdriveClientSecret: null, // custom Google Drive client secret

    onedrive: true, // enable OneDrive integration
    onedriveClientId: null, // custom OneDrive client id
    onedriveClientSecret: null, // custom OneDrive client secret
    onedriveTenantId: null, // custom OneDrive tenant id

    msteams: false, // enable Microsoft Teams integration
    msteamsClientId: null, // custom Microsoft Teams client id
    msteamsClientSecret: null, // custom Microsoft Teams client secret
    msteamsTenantId: null // custom Microsoft Teams tenant id
};

export { DefaultAppSettings };
