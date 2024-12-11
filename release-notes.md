## Release notes

##### v1.19.0 (TBA)

`+` feat: passphrase generation ([EFF](https://eff.org/dice) Wordlist)  
`+` feat: new generator pattern: `spaces`  
`+` feat: new generator preset: `512 bit hash`  
`+` feat: new generator preset: `UUID4`  
`+` feat: reveal password functionality (#2050)
`+` feat: setting to allow for full file paths to be displayed in "Recently Opened" list (#2118)  
`+` feat: wipe password text-field after 1 minute of inactivity on home vault page  
`+` feat: otpauth now supports multiple otpauth syntax `otpauth://totp?secret=`, `otpauth://totp/default?secret=`  
`+` feat: markdown attachment support - read/see properly formatted markdown files ending with extension `.md`  
`+` feat: dev-tools for Desktop using hotkey  
`+` new user setting: `Security` › `Enable reveal password`  
`+` new user setting: `Storage` › `Show full paths for local storage`  
`+` new user setting: `Appearance` › `Font Size` › `Smaller`  
`^` change: updated large number of dependencies  
`^` change: update password generator interface  
`^` change: release v2 of [KeeWeb Favicon Grabber](https://services.keeweb.info/), completely re-written - [source code](https://github.com/keeweb/keeweb-favicon-worker) (#2108)  
`^` change: can now go two levels deeper with folder structure  
`^` change: bump minimum node framework from v15.x.x to v18.12.0 LTS  
`^` change: bump electron to v13 (#2052)  
`^` change: remove deprecated jquery methods  
`^` change: iconpack updated to FontAwesome 6  
`-` fix: over 60+ vulernabilities due to outdated package dependencies  
`-` fix: no longer requires environment variable for legacy support / OpenSSL   
`-` fix: error:0308010C:digital envelope routines::unsupported (#2090, #2144)  
`-` fix: convert space character to non-breaking space on password reveal (#2151)  
`-` fix: support multiple otpauth url structures (#2148)  
`-` fix: addresses not being able to unset a keyfile once added to a vault (#2146)  
`-` fix: unable to remove keyfile from vault (#1924, #2030)  
`-` fix: csv parser ignoring last entry due to imcorrect condition (#1904, #1944)  
`-` fix: shortcuts from gdrive return 4XX error (#1519, #2008)  

##### v1.18.7 (2021-07-18)

`+` added: Microsoft Teams storage  
`+` added: a possibility to override tenant in Microsoft OneDrive  
`!` disabled automatic installation of KeePassXC-Browser extension  
`+` added: an option to diagnose YubiKey code listing issues  
`-` fix: #1845: fixed a visible crash on socket write error

##### v1.18.6 (2021-05-19)

`-` fix: #1824: saving KDBX3 files with compression disabled  
`-` fix: #1818: extension connection error if browser cannot be identified  
`-` fix: #1820: minimize on close on macOS

##### v1.18.5 (2021-05-14)

`-` fix: #1816: old Chromium support, such as Android Edge  
`-` fix: #1817: crash on files with large attachments as KDBX3

##### v1.18.4 (2021-05-12)

`+` #1814: option to disable auto-type title filter by default  
`-` #1808: restore KeeWeb from system tray on extension request  
`-` fix: #1810: extension connection on old macOS (10.11)  
`-` fix: #1813: custom icon selection  
`-` fix: #1811: app doesn't quit during update

##### v1.18.3 (2021-05-09)

`-` fix: #1804: filling OTP in browser extensions  
`*` fix: #1805: auto-unchecking auto-type filters if nothing found  
`*` fix: #1806: fixed a possible config loading error during startup

##### v1.18.2 (2021-05-08)

`-` fix: #1802: opening files with saved keyfiles

##### v1.18.1 (2021-05-08)

`-` fixed entry attachments display

##### v1.18.0 (2021-05-08)

`+` browser extension "KeeWeb Connect"  
`+` support for KeePassXC-Browser  
`+` optimized memory consumption for large files  
`+` KDBX4.1 support  
`+` option to use short-lived tokens in cloud storages  
`+` opening XML and CSV files using the Open button  
`*` password generator now includes all selected character ranges  
`*` option to auto-save on file change  
`+` better Touch ID error messages  
`-` remove: legacy auto-type  
`+` displaying the reason why unlock is requested  
`+` filters on the auto-type entry selection screen  
`+` adding multiple websites to one entry  
`+` translated application menu on macOS  
`-` fixed a crash after disabling USB devices on Linux  
`+` tightened content security policy  
`-` KeeWebHttp deprecated

##### v1.17.6 (2021-04-09)

`+` team drives support in Google Drive  
`-` fix: #1786: saving refresh_token in Google Drive  
`-` fix: #1767: updater issues on macOS

##### v1.17.5 (2021-03-27)

`+` ykman v4 support  
`+` fix: #1725: setting expiry date in the past  
`-` fix: #1762: line breaks in Markdown notes  
`-` fix: #1734: overlapping generator icon on password inputs  
`-` fix: #1758: export format HTML issues  
`-` fix: #1755: calendar tooltips in different time zones  
`-` restored the missing local file icon on the open screen  
`*` new Windows code signing certificate

##### v1.17.4 (2021-03-18)

`-` fix: #1740: Windows updater issues  
`-` fix: #1749: auto-type freezes on macOS

##### v1.17.3 (2021-03-14)

`-` fix: #1747: white screen in old Safari

##### v1.17.2 (2021-03-13)

`-` fixed crashes in the USB module on Windows  
`-` fix: #1745: deleting selected text in auto-type selector  
`-` fix: #1738: fixed auto-type on Linux with NumLock pressed

##### v1.17.1 (2021-03-10)

`-` fix: #1735: issue with auto-typing some characters on Windows

##### v1.17.0 (2021-03-07)

`+` opening files with Touch ID on macOS (opt-in)  
`+` password quality warnings  
`+` "Have I Been Pwned" service integration (opt-in)  
`+` automatically switching between dark and light theme  
`+` custom title bar on Windows  
`*` new updater capable to upgrade major versions  
`*` new auto-type rewritten from scratch  
`+` possibility to detect browser URL on Linux  
`*` external modification protection in desktop versions  
`+` clear searchbox button  
`+` more options for auto-lock timeout  
`+` favicon download improvements  
`+` auto-type field selection dropdown improvements  
`+` new completion page after storage provider authentication  
`+` option to disable caching files in offline storage  
`+` option to minimize on field copy  
`-` fixed creating files with Argon2id KDF

##### v1.16.8 (2021-03-02)

`-` fix: #1726: search in protected fields  
`-` fix: #1713: OneDrive authentication on web  
`-` fix: #1715: storage authentication in Epiphany browser  
`-` fix: #1711: storage authentication in iOS

##### v1.16.7 (2020-12-31)

`-` fix: #1671: new lines removal issue in notes

##### v1.16.6 (2020-12-30)

`-` fix: #1668: opening files with bad characters  
`*` upgraded a vulnerable dependency

##### v1.16.5 (2020-12-18)

`-` using custom OneDrive without a secret  
`+` GitHub funding link

##### v1.16.4 (2020-12-17)

`-` fix: #1656: false positive report on VirusTotal  
`+` #1629: possibility to use OneDrive as SPA

##### v1.16.3 (2020-12-10)

`-` fix: #1650: keyfiles stored in the app can't be used

##### v1.16.2 (2020-12-10)

`+` possibility to use V2 keyfiles (.keyx)  
`-` fixed a missing icon in the local file question box  
`-` fix: #1649: missing Argon2 options  
`-` minor license screen fixes

##### v1.16.1 (2020-12-04)

`+` native Apple Silicon build  
`+` Argon2id KDF support  
`+` added: an option to quit the app and lose all changes  
`-` fix: #1637: git commit in the About box  
`-` fixed some design glitches  
`*` keyfile paths are saved by default

##### v1.16.0 (2020-11-29)

`+` updated icons and visual design  
`+` new Dark (default) and Light themes  
`-` fixed a performance issue in searching entries  
`+` locale-aware date and time formats  
`*` improved the "Show all file" checkbox behavior  
`+` shortcut to copy OTP  
`+` support for WebDAV servers without Last-Modified header  
`*` switched to Dropbox short-lived access tokens  
`-` fixed several issues in field editing  
`-` fix: #1561: error during loading configs after reset  
`-` fixed some issues with minimizing to menubar on macOS

##### v1.15.7 (2020-09-12)

`-` fix: #1564: broken auto-type on some Linux installations  
`-` fix: #1591: error in old MS Edge  
`-` fix: #1598: fixed header format for KDBX4+AES  
`-` fix: #1597: Dropbox sync now includes scopes  
`*` PKCE enabled on Dropbox auth  
`*` updated vulnerable dependencies

##### v1.15.6 (2020-08-08)

`-` fix: #1553: empty fields display for templates  
`-` fix: #1581: double-clicking KeeWeb icon in Dock

##### v1.15.5 (2020-06-13)

`-` fix: #1539: broken code signing on Windows

##### v1.15.4 (2020-06-13)

`-` fix: #1536: added: a missing dependency on linux  
`-` fix: #1532: crashes on some Windows builds (updated electron)

##### v1.15.3 (2020-06-11)

`-` fix: #1535: network errors in Dropbox and GDrive on Windows

##### v1.15.2 (2020-06-09)

`-` fix: #1530: recursive creation of the portable directory  
`-` fix: #1530: running from directories with hash symbols  
`+` possibility to debug startup with `--start-logging`  
`*` updated electron version  
`-` fixed duplicated YubiKeys displayed in file settings  
`-` fix: #1409: auto-type wrong character issues on Linux

##### v1.15.1 (2020-06-07)

`-` fix: #1528: OTP generation for stored values

##### v1.15.0 (2020-06-06)

`+` YubiKey integration in two modes: OATH and Challenge-Response  
`+` configs are now encrypted with a key stored in keychain  
`*` default format for new files is now KDBX4  
`+` #1460: auto-type on double-clicking field labels  
`+` #557: Argon2 speed improvements in desktop apps  
`+` #1503: ARM64 Windows support  
`+` #1480: option to create a portable installation  
`+` #1400: auto-apply tag when creating new entry in tag view  
`*` default theme on macOS is now macOS-Dark  
`+` #1342: hint that the data will be stored in unencrypted form after exporting  
`*` #1471: WebDAV url validation, only HTTPS is allowed  
`+` #1350: clearing master password after auto lock period  
`+` #830: minimize instead of close option on macOS  
`+` #448: minimized login option support on macOS  
`+` #917: option to install without a desktop icon on Windows  
`-` fix: #1463: copying the original url instead of adding https:  
`-` fix: #620: clearing middle-click clipboard in Linux  
`-` fix: #1440: fixed auto-type for maximized windows  
`-` fix: #1509: fixed auto-type for tiling mode in Linux  
`-` fix: #1409: fixed auto-typing Tab character on Debian

##### v1.14.3 (2020-05-15)

`*` improved exporting files with markdown notes

##### v1.14.2 (2020-05-04)

`-` distinct redirect URIs for storage providers

##### v1.14.1 (2020-05-02)

`-` fix: #1478: fixed proxy issues with storage providers

##### v1.14.0 (2020-04-18)

`+` using OAuth authorization code grant for all storage providers  
`-` fixed a number of vulnerabilities in opening untrusted kdbx files  
`+` applied recommendations from the electron security checklist  
`*` canOpenWebdav is now canOpenStorage  
`+` option to log out from storages  
`*` saving only modified settings instead of everything

##### v1.13.4 (2020-04-15)

`-` fix: #1457: fixed styles in theme plugins  
`+` #1456: options to hide webdav and password generator

##### v1.13.3 (2020-04-11)

`-` fix: #1451: fixed slow global auto-type on desktop

##### v1.13.2 (2020-04-09)

`+` files previously created as v4.1 will be written as v4.0  
`+` fixed Docker build  
`*` builds are now run on CI

##### v1.13.1 (2020-04-04)

`-` fix: #1444: fixed website favicons and attached images  
`-` fix: #1445: fixed offline mode in Chrome and Firefox  
`-` fix: #1447: fixed opening databases from Dock

##### v1.13.0 (2020-04-03)

`-` #1359: fixed Google Drive login issues in desktop apps  
`+` #1341: auto-lock the app on screen lock on Windows  
`+` #1065: KEEWEB_PORTABLE_EXECUTABLE_DIR environment variable  
`*` #1397: Segoe UI font on Windows  
`+` #1393: option to disable saving and exporting (canSaveTo)  
`+` #1006: password generator patterns  
`+` #1309: back button in attachment preview  
`+` #1142: submit button on mobile password input  
`+` #766: setting for no/unlimited history  
`+` #411: option to automatically use group icon for new entries  
`+` #615: translated shortcut modifier keys  
`*` #1029: fixed syncing files by timeout when there are no changes  
`+` #784: AppImage distributable  
`+` #572: RPM distributable  
`+` #450: Snap distributable  
`+` #855: appdata file in deb packages  
`*` signature key rotated  
`*` new Windows code signing certificate  
`+` startup time profiling  
`+` #1438: content security policy  
`+` some desktop security improvements from #1437  
`*` fix: #890: deb will no longer install to /opt  
`-` fix: #1396: fixed hyperlinks in notes  
`-` fix: #1323: version in the About dialog  
`-` fix: #734: OTP secrets with spaces  
`-` fix: #1208: webdav credentials corruption  
`*` fix: #1348: fixed password generation entropy  
`-` fix: #1385: fixed a file watcher error on network locations  
`-` fix: #1391: passwords imported from CSV were not hidden  
`-` fix: #1387: fixed drag-drop for otp fields  
`-` fix: #1293: copying full urls  
`-` fix: #1378: screen orientation issues on Android PWA  
`-` fix: #1338: minimized option not working on linux  
`-` fix: #895: generator positioning in list view  
`-` fix: #516: scrolling on the open screen on mobile  
`-` fix: #1295, #1353: displaying passwords as protected fields regardless of settings in the file

##### v1.12.3 (2019-11-06)

`-` fix: #1335: removed the menubar on Windows and Linux  
`-` fix: #1334: saving new files not working  
`-` fixed entry title input size

##### v1.12.2 (2019-11-03)

`-` fixed non-working updater  
`-` fix: #1336: saving disabled storage option  
`-` fix: #1333: item selection in the auto-type pop-up  
`-` fix: #1337: displaying groups in trash

##### v1.12.1 (2019-10-27)

`-` fix: #1324: duplicated shortcut editor in settings  
`-` fix: #1313: disabled code signing for macOS dmg

##### v1.12.0 (2019-10-26)

`-` #1022: fuzzy search  
`+` #1108: setting for running in an iframe  
`+` #963: keyboard shortcut to copy OTP in background  
`+` #565: global shortcut to open KeeWeb  
`+` #862: downloading attachments on mobile  
`+` #480: option to launch the app minimized  
`+` #1307: option to disable Markdown support  
`+` #1310: password generator on the start screen  
`+` #197: mobile actions panel  
`-` fix: #1273: untranslated menu items  
`-` fix: #1311: better monospace fonts  
`-` fix: #1319: removed a storage request for invalid passwords

##### v1.11.10 (2019-10-16)

`-` fix: #1305: WebDAV issues  
`-` fix: #1263: desktop apps crashes when argon2 is used

##### v1.11.9 (2019-10-13)

`-` fix: #1300: selecting auto-type sequence items issues  
`-` fix: #1290: generator popup positioning in custom themes

##### v1.11.8 (2019-10-11)

`-` fix: #1292: macOS app notarization  
`-` fix: #1296: search in auto-type  
`-` fixed issues with some theme plugins

##### v1.11.7 (2019-10-08)

`-` fix: #1289: crash on Auto sorting mode  
`-` fix: #1288: issues when opening a file during in auto-type mode

##### v1.11.6 (2019-10-04)

`-` fix: #1285: issues in moving entries across files

##### v1.11.5 (2019-09-29)

`-` fix: #1279: error opening files with saved keyfiles

##### v1.11.4 (2019-09-29)

`-` fix: #1277: auto-type window matching on Linux  
`-` fix: #1278: entry selection auto-type window issues  
`-` fixed displaying errors on the plugins page

##### v1.11.3 (2019-09-29)

`-` fix: #1275: starting the app after closing on macOS  
`-` fix: #1276 GDrive connection issues

##### v1.11.2 (2019-09-29)

`-` fix: #1272: Argon2 error  
`-` fixed Dropbox connection on iOS 13 homescreen  
`-` fixed plugin search filtering

##### v1.11.1 (2019-09-28)

`-` fix: #1270: password change control focus  
`-` fix: #1271: loading custom plugins from config

##### v1.11.0 (2019-09-28)

`+` #1125: field actions: copy, reveal, auto-type  
`+` #107: multiline custom fields support  
`+` #713: markdown notes  
`+` #1243: auto-type any field  
`+` #336: moving entries across files  
`+` #348: configurable system-wide shortcuts  
`+` #1255: file format version and kdf selection in settings  
`+` #743: copying entry fields to clipboard  
`+` #498: CSV import  
`+` #564: Steam OTP support  
`+` #1226: 7-digit Authy OTP support  
`*` #502: increased the default value of encryption rounds  
`+` #1252: public key rotation  
`*` #156: using ServiceWorker instead of AppCache  
`*` devtools are now opened with alt-cmd-I  
`-` fix: #764: multiple attachments display  
`-` fix: multi-line fields display in history  
`-` fix: #554: checking active window id during auto-type  
`-` fix: plugin gallery layout on mobile  
`-` fix: #1141: opening file from storage if cache is not available  
`-` fixed a color flash on start

##### v1.10.1 (2019-09-20)

`-` fixed Argon2 issues in Safari 13  
`-` fix: #1259: using absolute paths in webdav

##### v1.10.0 (2019-09-09)

`+` macOS Dark theme  
`+` HTML export  
`+` pretty-printing exported XML files  
`+` config option to disable XML export (canExportXml)  
`+` XML files can be now opened as regular files  
`*` donation link changed  
`-` fixed field editing styles  
`-` fix: #1154: relative Destination header in WebDAV MOVE  
`-` fix: #1129: webdav storage error on Unicode filenames  
`*` dropped support for browsers without css variables  
`*` displaying websites as HTTPS if no scheme is provided  
`+` confirmation for deleting an entry on mobile  
`-` fix: #1244: deb file permissions issue

##### v1.9.3 (2019-09-07)

`-` fixed group settings not being displayed  
`-` fixed menu padding issues in some browsers  
`-` fixed titlebar color on macOS dark theme

##### v1.9.2 (2019-08-22)

`-` fix: #1235: custom themes loading  
`-` fix: #1234: auto-type issues in xubuntu/xfce

##### v1.9.1 (2019-08-19)

`-` fix: #1231: tooltip arrow positioning  
`+` improved ranking search  
`-` fix: #1232: removed an unwanted menubar on windows and linux  
`-` fix: #1234: auto-type not working on linux

##### v1.9.0 (2019-08-18)

`-` fix: #1221: added: '30 min' lock option  
`-` fixed generator style issues in Firefox  
`+` option to hide password in the generator  
`-` fix: #1209: copying app information to clipboard  
`-` fix: #1215: url matching when there's no website field  
`-` fix: #1171: enabled updater on linux  
`*` upgraded build system  
`*` upgraded electron to v6  
`-` remove: support for linux/ia32: https://electronjs.org/blog/linux-32bit-support

##### v1.8.2 (2019-04-22)

`-` fix: #1163: fixed libgconf-2-4 dependency

##### v1.8.1 (2019-04-05)

`-` fix: #1152: broken filtering after auto-type

##### v1.8.0 (2019-03-31)

`+` iOS PWA improvements  
`+` auto-type improvements  
`*` website icons are downloaded using favicon.keeweb.info

##### v1.7.8 (2019-03-02)

`-` fix: #1124: keyboard navigation issues  
`*` improved link security

##### v1.7.7 (2019-02-09)

`-` another attempt to fix: focus issues

##### v1.7.6 (2019-02-07)

`-` fixed focus issues in desktop apps

##### v1.7.5 (2019-02-04)

`-` fix: #1096: focus issues after minimizing  
`-` fix: #1094: plugin installation in MS Edge

##### v1.7.4 (2019-01-17)

`-` fix: #423: input focus issues in desktop apps

##### v1.7.3 (2019-01-13)

`-` fixed window activation when KeeWeb is launched second time  
`-` fix: #1087: Windows AutoType helper is now using .NET Framework v4  
`*` fix: #1085: fixed dropbox in iOS PWA, removed manifest.json

##### v1.7.2 (2019-01-07)

`-` fixed Google Drive cookies issues  
`-` fixed storage providers authentication  
`-` fix: #1079: error launching another instance  
`-` fix: #1078: updater hanged on "extracting files"

##### v1.7.1 (2019-01-06)

`-` fix: #1077: broken auto-type

##### v1.7.0 (2019-01-06)

`+` downgrading desktop apps  
`-` fixed calendar colors  
`+` option to open a keyfile from command line  
`+` master password confirmation  
`-` json config bugfixes  
`-` better icons  
`+` major electron upgrade  
`-` text improvements  
`-` fixed large attachments issues  
`+` usability improvements

##### v1.6.3 (2017-12-11)

`-` fixed Windows installer upgrade issue

##### v1.6.2 (2017-12-09)

`+` Google Drive shared files support  
`-` fixed Google Drive authentication issues  
`-` fixed a color flash on startup

##### v1.6.1 (2017-12-03)

`-` fixed white screen on startup  
`+` `--devtools` command line argument

##### v1.6.0 (2017-12-02)

`+` desktop apps integrity protection  
`+` auto-lock on computer lock  
`+` redesigned Dropbox chooser  
`+` WebDAV file creation  
`+` safari tab icons  
`*` prevent master password autocomplete  
`*` build with node.js 8  
`-` fixed tray icon click crash  
`*` show usernames in entry list  
`*` password can be hidden as other fields  
`*` clear clipboard on exit  
`*` don't remove spaces in custom fields  
`*` auto-type on subdomains  
`*` plugin signature validation

##### v1.5.6 (2017-08-31)

`-` fix: #722: hang on start in desktop  
`-` fix: #653: auto-closing tab when starting from link

##### v1.5.5 (2017-08-30)

`-` fix: #621, #340: tray icon crash  
`-` fixed some security issues

##### v1.5.4 (2017-06-03)

`-` fix: #649: loading keyfiles with path  
`-` fix: #645: layout issues while switching table view  
`-` fix: #651: window drag style  
`-` fix: #652: create a copy bug

##### v1.5.3 (2017-05-29)

`-` fix: #638: password generator drag issues  
`-` fix: #636: broken layout in edge 15  
`-` fix: #641: fixed mac app layout issues  
`-` plugin gallery load button

##### v1.5.2 (2017-05-25)

`-` fix: #633: template ids issues

##### v1.5.1 (2017-05-23)

`-` fix: #631: unicode characters in Dropbox files  
`-` fix: backups in desktop  
`+` plugin API improvements

##### v1.5.0 (2017-05-20)

`+` plugins  
`*` translations are available only as plugins  
`*` Dropbox API V2  
`*` deprecated IE  
`+` entry templates  
`+` support cloud providers in iOS homescreen apps  
`+` auto-type improvements and bugfixes  
`+` mobile field editing improvements  
`+` file path hint in recent files list  
`+` cacheConfigSettings config option  
`+` keyboard-accessible autocomplete  
`+` entry auto-type context menu  
`+` save to WebDAV with PUT  
`+` showOnlyFilesFromConfig config option  
`+` mac os window style options  
`+` lock on hide mac os hide  
`+` release distribution improvements  
`+` error message for not supported browsers  
`-` remove: support of devices without clipboard api

##### v1.4.1 (2017-03-26)

`+` fix: #544: read files with empty binaries  
`+` fix: #555: keyfile selection issue

##### v1.4.0 (2017-02-04)

KDBX4 format support and minor improvements  
`+` password generator usability improvements  
`+` warning about several tabs  
`+` use browser language as default locale  
`+` auto-lock in 12 hours or day  
`+` text fields context menu on desktop  
`+` option to disable latest file removal  
`-` fix: #432: drag-drop in vivaldi  
`-` fix: auto-type enabled/disabled issues

##### v1.3.3 (2016-09-20)

`+` translations: fr, pl, pt  
`-` fix: #368: desktop file save error  
`-` fix: #369: removed additional webdav request  
`+` allow password copy on mobile Safari

##### v1.3.2 (2016-09-13)

`-` fix: #342: url detection in Microsoft Edge  
`-` fix: #351: error alert on power shutdown  
`-` fix: #344: prevent caching WebDAV requests  
`-` fix: #363: drag-drop in Firefox  
`-` fix: #357: linux auto-type issues

##### v1.3.1 (2016-09-02)

`-` fix: #337: storage sync error

##### v1.3.0 (2016-09-01)

Generator presets, auto-type and ui improvements  
`+` auto-type improvements  
`+` context menu  
`+` solarized themes  
`+` generator presets  
`+` group reorder  
`+` auto backups  
`+` select field contents on search hotkey  
`+` option to preload default config and file  
`+` save displayed table columns  
`+` confirmation in password change dialog  
`+` inline generator keyboard management  
`+` field references decoding  
`+` copy entries  
`+` option to disable open, new and demo buttons  
`-` fix: app redraw in background  
`-` fix: idle timer on computer sleep  
`-` fix: storage popup when no action is required  
`-` fix: loading raw 32-byte and 64-byte keyfiles  
`-` fix: data loss on exit with focused field

##### v1.2.4 (2016-07-20)

`+` digital signature in installer  
`-` fix: save to file  
`-` mark file as modified on trash empty

##### v1.2.3 (2016-07-17)

`+` option to skip lock on minimize under mac  
`-` fix: dropbox popup error  
`-` fix: auto-type input

##### v1.2.2 (2016-07-14)

`-` fix: special keys auto-type in linux

##### v1.2.1 (2016-07-12)

`-` fix: storage auth popups on desktop

##### v1.2.0 (2016-07-11)

Auto-type, ui improvements  
`+` allow selecting attachments with click  
`+` save groups collapsed/expanded state  
`+` docker container  
`+` edit and remove tags  
`+` register file associations  
`+` high contrast theme  
`+` ability to increase font size  
`+` improved start page ux on mobile  
`+` option to show app logs  
`+` group info in entry details  
`+` logout from remote storages on disable  
`+` select file for new records  
`+` customizable table view  
`+` ability to load json config  
`*` don't check updates at startup  
`*` repos moved to github organization account  
`*` allow opening same file twice  
`*` local files are not saved to cache  
`-` prevent second app instance on windows

##### v1.1.4 (2016-04-21)

`-` fixed Firefox loading issues

##### v1.1.3 (2016-04-21)

`+` google drive stability improvements  
`+` fix: some layout bugs  
`-` fix: generator preset for empty passwords  
`+` export settings get/set interface

##### v1.1.2 (2016-04-10)

`+` option to try beta version in desktop app  
`-` fix: notes field text color  
`-` fix: some console assertions  
`-` fix: message about not found files  
`-` fix: deletion to trash when there's no trash folder

##### v1.1.1 (2016-04-07)

`+` minimize app on linux  
`+` display remembered keyfile name  
`-` fix: #182: save window position on Windows

##### v1.1.0 (2016-04-05)

Storage providers, one-time passwords, usability improvements  
`+` WebDAV  
`+` Google Drive, OneDrive  
`+` one-time passwords  
`+` option to remember keyfiles  
`+` password generation presets  
`+` open files created without password  
`+` usernames autocomplete  
`+` files open improvements  
`+` beta version app  
`+` option to lock on password copy  
`+` save/restore window position after close  
`+` shortcut to copy username  
`+` regenerate password button  
`+` option to search in title  
`+` shortcut to copy website  
`+` shortcuts while the app is in background  
`+` build for 32-bit linux  
`+` ability to import xml  
`+` warning for kdb files  
`+` hide empty fields  
`+` overall spacing increased  
`+` hide demo button once opened  
`+` show error details on open  
`+` select dropbox folder  
`+` building deb  
`+` theme color for mobile chrome  
`-` fix: capslock indicator  
`-` fix: file settings input behavior  
`-` fix: favicon download  
`-` fix: protected fields copy-paste

##### v1.0.4 (2016-02-25)

Workaround for Chrome bug  
`-` #110: fix: font rendering in Chrome

##### v1.0.3 (2016-02-23)

`+` #94: warn user about local files  
`-` #92: save files on exit  
`-` #95: unlock by opening settings  
`-` fix: crash on arch linux startup

##### v1.0.2 (2016-02-17)

`-` #80: dragdrop bug

##### v1.0.1 (2016-02-14)

Bugfixes  
`-` fix: tags selection  
`-` fix: updater bug

##### v1.0.0 (2016-02-12)

Performance, stability and quality improvements  
`+` track changes in local files  
`+` mobile layout made more convenient  
`+` command-line option to disable updater  
`+` using system proxy se
ttings for updater  
`+` webapp icon for touch devices  
`-` #80: prevent data loss on group move  
`-` issues with clipboard clear fixed

##### v0.6.1 (2016-02-02)

App moved to app.keeweb.info

##### v0.6.0 (2016-01-19)

Improvements  
`+` advanced search  
`+` ability to sync files with changed credentials  
`+` save at exit for desktop app  
`+` more reliable binaries management  
`+` string resources globalization  
`+` San-Francisco font in Chrome OS X  
`+` help/tips  
`+` #67: field editing improvements  
`*` monospace fonts for protected fields  
`*` #68: url display without http  
`+` #50: notification on password copy  
`-` #74: select all in search field

##### v0.5.1 (2015-12-15)

Layout bugfixes  
`-` #66: keyfile selection in Firefox  
`-` entries list layout issue in iOS Safari

##### v0.5.0 (2015-12-14)

2-way merge sync  
`*` all files are now opened with offline support  
`*` disallow opening same files twice  
`*` default theme is now blue  
`+` #46: option to show colorful icons  
`+` #45: optional auto-lock on minimize  
`+` option to disable searching for group  
`+` #62: saving files with empty password  
`+` #56: preserve selected entry after close  
`-` #55: custom scrollbar issues

##### v0.4.6 (2015-11-25)

`-` #32: visual glitches on Windows 10

##### v0.4.5 (2015-11-25)

Bugfixes  
`-` mobile safari layout issues  
`-` auto-restart in windows app

##### v0.4.4 (2015-11-22)

Auto-update restart on Windows fixed

##### v0.4.3 (2015-11-22)

Windows minimize to tray bugfix

##### v0.4.1, v0.4.2 (2015-11-22)

Auto-update and bugfixes

##### v0.4.0 (2015-11-22)

Locking, better Dropbox, custom icons, security enhancements, bugfixes  
`+` lock flow, auto-lock  
`+` entries list display table layout  
`+` minimize to tray on windows  
`+` desktop Dropbox  
`+` Dropbox notification in self-hosted apps  
`+` custom icons support  
`+` option to check updates without install  
`+` clear clipboard password after timeout  
`+` trim history by rules  
`-` fixed tag list scrolling  
`-` entry deletion didn't mark file as modified

##### v0.3.0 (2015-11-14)

Auto-update  
`+` remember menu and list width  
`-` fixed protected field deletion

##### v0.2.1 (2015-11-10)

Fixed KeePassX compatibility issues

##### v0.2.0 (2015-11-09)

UX improvements, offline, trash, protected fields, bugfixes  
`+` improved open page ux  
`+` trash management  
`+` protected fields support  
`+` keyfiles from Dropbox  
`+` #17: option to hide entries from subgroups  
`+` #5: groups and entries arranging  
`+` #13: increase max generated password length  
`+` #20: default http:// for urls without protocol  
`-` #12: cannot edit entries without title  
`-` #21: history inside history entries

##### v0.1.1 (2015-11-04)

Bugfix and performance enhancements  
`+` support non-xml keyfiles  
`+` remove: limitation for extensions of opened files  
`+` #10: using WebCrypto for better open performance  
`-` #11: can create a group without name  
`-` #3: desktop app quits without question about unsaved changes  
`-` #2: shortcuts are not working in Mac app

##### v0.1.0 (2015-10-31)

First MVP
