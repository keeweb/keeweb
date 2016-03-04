# KeePass web app (unofficial)

This webapp is a browser and desktop password manager compatible with KeePass databases. It doesn't require any server or additional resources.
The app can run either in browser, or as a desktop app.

![screenshot](https://habrastorage.org/files/ec9/108/3de/ec91083de3e64574a504bc438d038dec.png)

# Quick Links

Apps: [Web](https://app.keeweb.info/) [Desktop](https://github.com/antelle/keeweb/releases/latest)  
Timeline: [Release Notes](release-notes.md) [TODO](https://github.com/antelle/keeweb/wiki/TODO)  
On one page: [Features](https://keeweb.info/#features) [FAQ](https://github.com/antelle/keeweb/wiki/FAQ)  
Website: [keeweb.info](https://keeweb.info)  
Twitter: [kee_web](https://twitter.com/kee_web)  

# Status

Project roadmap with planned features and approximate schedule is on [TODO](https://github.com/antelle/keeweb/wiki/TODO) page.  

# Self-hosting

Everything you need to host this app on your server is any static file server. The app is a single HTML file + cache manifest (optionally; for offline access).
You can download the latest distribution files from [gh-pages](https://github.com/antelle/keeweb/tree/gh-pages) branch.
To make Dropbox work in your self-hosted app:

1. [create](https://www.dropbox.com/developers/apps/create) a Dropbox app
2. find your app key (in Dropbox App page, go to Settings/App key)
3. change Dropbox app key in index.html file: `sed -i.bak s/qp7ctun6qt5n9d6/your_app_key/g index.html`
    (or, if you are building from source, change it [here](app/scripts/comp/dropbox-link.js#L12))

# Building

The app can be built with grunt: `grunt` (html file will be in `dist/`).    
Desktop apps are built with `grunt desktop`. This works only in mac osx as it builds dmg; requires wine.  
To run Electron app without building installer, install electron package (`npm install electron-prebuilt -g`), build the app with `grunt` and start in this way:
```bash
$ grunt
$ electron electron --htmlpath=tmp
```

For debug build:

1. run `grunt`
2. run `grunt watch`
3. open `tmp/index.html`

# Contributing

Please, read contribution guidelines: [for issues](.github/ISSUE_TEMPLATE.md) and [for pull requests](.github/PULL_REQUEST_TEMPLATE.md).  
For pull requests: branch is important! `master` is only for hotfixes, `develop` is for new features.

# License

[MIT](https://github.com/antelle/keeweb/blob/master/MIT-LICENSE.txt)
