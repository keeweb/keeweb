const Launcher = require('../../comp/launcher');

const ForeMostAppScript = 'tell application "System Events" to set frontApp to name of first process whose frontmost is true';
const ChromeScript = 'tell application "{}" to set appUrl to URL of active tab of front window\n' +
    'tell application "{}" to set appTitle to title of active tab of front window\n' +
    'return appUrl & "\n" & appTitle';
const SafariScript = 'tell application "{}" to set appUrl to URL of front document\n' +
    'tell application "{}" to set appTitle to name of front document\n' +
    'return appUrl & "\n" & appTitle';
const OtherAppsScript = 'tell application "System Events"\n' +
    '   tell process "{}"\n' +
    '       tell (1st window whose value of attribute "AXMain" is true)\n' +
    '           set windowTitle to value of attribute "AXTitle"\n' +
    '       end tell\n' +
    '   end tell\n' +
    'end tell';

const AutoTypeHelper = function() {
};

AutoTypeHelper.prototype.getActiveWindowTitle = function(callback) {
    AutoTypeHelper.exec(ForeMostAppScript, (err, out) => {
        if (err) { return callback(err); }
        const appName = out.trim();
        // getting urls and titles from Chrome or Safari:
        // - will suit in 90% cases
        // - does not require assistive access
        // - allows to get url
        if (['Google Chrome', 'Chromium', 'Google Chrome Canary'].indexOf(appName) >= 0) {
            AutoTypeHelper.exec(ChromeScript.replace(/\{}/g, appName), (err, out) => {
                if (err) { return callback(err); }
                const parts = out.split('\n');
                return callback(null, (parts[1] || '').trim(), parts[0].trim());
            });
        } else if (['Safari', 'Webkit'].indexOf(appName) >= 0) {
            AutoTypeHelper.exec(SafariScript.replace(/\{}/g, appName), (err, out) => {
                if (err) { return callback(err); }
                const parts = out.split('\n');
                return callback(null, (parts[1] || '').trim(), parts[0].trim());
            });
        } else {
            // special cases are not available. this method may ask the user about assistive access
            AutoTypeHelper.exec(OtherAppsScript.replace(/\{}/g, appName), (err, out) => {
                if (err) { return callback(err); }
                return callback(null, out.trim());
            });
        }
    });
};

AutoTypeHelper.exec = function(script, callback) {
    Launcher.spawn({
        cmd: 'osascript',
        args: ['-e', script],
        complete: callback
    });
};

module.exports = AutoTypeHelper;
