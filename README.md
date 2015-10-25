# KeePass web app (unofficial)

This webapp can read KeePass databases. It doesn't require any server or additional resources.
It can be run either in browser, or as a desktop app. 

![screenshot](https://antelle.github.io/keeweb/screenshot2x.png)

# Quick Links

[Web](https://antelle.github.io/keeweb/)
[Windows](https://github.com/antelle/keeweb/releases/download/v0.0.1/KeeWeb.win32.exe)
[Mac OSX](https://github.com/antelle/keeweb/releases/download/v0.0.1/KeeWeb.mac.dmg)
[Linux](https://github.com/antelle/keeweb/releases/download/v0.0.1/KeeWeb.linux.x64.zip)

# Status

Reading and display is mostly complete; modification and sync is under construction, please see [TODO](TODO.md) for more details.

# Building

The app can be built with grunt: `grunt` (html file will be in `dist/`) or `grunt watch` (result will be in `tmp/`).
Electron app is built manually, scripts and configs are in `util` directory.
To run Electron app without building, install electron package (`npm install electron-prebuilt -g`) and start with `electron ./electron/`.

# Contributing

Plugins are not supported for now. If you want to add a feature, please contact the author first. Pull requests, patches and issues are very welcome.  
If you have found an bug, please [open an issue](https://github.com/antelle/keeweb/issues/new) and fill in the app version and your user-agent 
(you can find these details on Settings/Help section).

# License

[MIT](https://github.com/antelle/keeweb/blob/master/MIT-LICENSE.txt)
