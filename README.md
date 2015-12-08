# KeePass web app (unofficial)

This webapp is a browser and desktop password manager compatible with KeePass databases. It doesn't require any server or additional resources.
The app can run either in browser, or as a desktop app. 

![screenshot](https://habrastorage.org/files/bfb/51e/d8d/bfb51ed8d19847d8afb827c4fbff7dd5.png)

# Quick Links

Apps: [Web](https://antelle.github.io/keeweb/) [Desktop](https://github.com/antelle/keeweb/releases/latest)  
Timeline: [Release Notes](release-notes.md) [TODO](https://github.com/antelle/keeweb/wiki/TODO)  
On one page: [Features](features.md) [FAQ](https://github.com/antelle/keeweb/wiki/FAQ)  
Twitter: [kee_web](https://twitter.com/kee_web)  

# Status

The app is already rather stable but might still need polishing, testing ang improvements before v1 release, which is expected to happen in Feb 2016. 
Please see [TODO](https://github.com/antelle/keeweb/wiki/TODO) for more details.

# Known Issues

These major issues are in progress, or will be fixed in next releases, before v1.0:

- dropbox sync is one-way: changes are not loaded from dropbox, only saved
- files are considered saved only when they are exported

# Self-hosting

Everything you need to host this app on your server is any static file server. The app is a single HTML file + cache manifest (optionally; for offline access).
You can download the latest distribution files from [gh-pages](https://github.com/antelle/keeweb/tree/gh-pages) branch.
To make Dropbox work in your self-hosted app:

1. [create](https://www.dropbox.com/developers/apps/create) a Dropbox app
2. find your app key (in Dropbox App page, go to Settings/App key)
3. change Dropbox app key in index.html file: `sed -i.bak s/qp7ctun6qt5n9d6/your_app_key/g index.html` 
    (or, if you are building from source, change it [here](scripts/comp/dropbox-link.js#L7))

# Building

The app can be built with grunt: `grunt` (html file will be in `dist/`).    
Desktop apps are built with `grunt desktop`. This works only in mac osx as it builds dmg; requires wine.  
To run Electron app without building, install electron package (`npm install electron-prebuilt -g`) and start in this way:
```bash
$ cd electron
$ electron . --htmlpath=../tmp
```

For debug build:

1. run `grunt`
2. run `grunt watch`
3. open `tmp/index.html`

# Contributing

Please, read [contribution guidelines](CONTRIBUTING.md).

# License

[MIT](https://github.com/antelle/keeweb/blob/master/MIT-LICENSE.txt)
