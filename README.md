# Free cross-platform password manager compatible with KeePass

This webapp is a browser and desktop password manager compatible with KeePass databases. It doesn't require any server or additional resources.
The app can run either in browser, or as a desktop app.

![screenshot](https://habrastorage.org/files/ec9/108/3de/ec91083de3e64574a504bc438d038dec.png)

# Quick Links

Apps: [Web](https://app.keeweb.info/), [Desktop](https://github.com/keeweb/keeweb/releases/latest)  
Timeline: [Release Notes](release-notes.md), [TODO](https://github.com/keeweb/keeweb/wiki/TODO)  
On one page: [Features](https://keeweb.info/#features), [FAQ](https://github.com/keeweb/keeweb/wiki/FAQ)  
Website: [keeweb.info](https://keeweb.info)  
Twitter: [kee_web](https://twitter.com/kee_web)  

# Status

Project roadmap with planned features and approximate schedule is on [TODO](https://github.com/keeweb/keeweb/wiki/TODO) page.  

# Self-hosting

Everything you need to host this app on your server is any static file server. The app is a single HTML file + cache manifest (optionally; for offline access).
You can download the latest distribution files from [gh-pages](https://github.com/keeweb/keeweb/tree/gh-pages) branch.  

If you are using Docker:

1. put your dh.pem, cert.pem, key.pem to /etc/nginx/external/ 
2. run this script:
```bash
docker run --name keeweb -d -p 443:443 -p 80:80 -v $EXT_DIR:/etc/nginx/external/ antelle/keeweb
```

To make Dropbox work in your self-hosted app:

1. [create](https://www.dropbox.com/developers/apps/create) a Dropbox app
2. find your app key (in Dropbox App page, go to Settings/App key)
3. add your Dropbox app key to [settings json](https://github.com/keeweb/keeweb/wiki/Configuration#json-app-config)

To make Google Drive work in your self-hosted app:
1. [Create](https://cloud.google.com/resource-manager/docs/creating-project#via_console) a Google Cloud Project
2. Create credentials (OAuth client ID and Web application)
3. Enter your self-hosted URL (e.g. https://www.example.com) in both Authorized JavaScript origins and Authorized redirect URIs
4. Add the new client ID to your [settings json](https://github.com/keeweb/keeweb/wiki/Configuration#json-app-config)

# Building

The app can be built with grunt: `grunt` (html file will be in `dist/`).    
Desktop apps are built with `grunt desktop`. This works only in mac osx as it builds dmg; requires wine.  
To run Electron app without building installer, install electron package (`npm install electron -g`), build the app with `grunt` and start in this way:
```bash
$ grunt dev
$ npm run-script electron
```

For debug build:

1. run `grunt dev`
2. open `http://localhost:8085/tmp`

# Contributing

Please, read contribution guidelines: [for issues](.github/ISSUE_TEMPLATE.md) and [for pull requests](.github/PULL_REQUEST_TEMPLATE.md).  
For pull requests: branch is important! `master` is only for hotfixes, `develop` is for new features.  
Here's a [list of issues](https://github.com/keeweb/keeweb/labels/need%20help) which need help.
Also you can help by [translating KeeWeb](https://keeweb.oneskyapp.com) to your language.  

### Important notes for pull requests

- please branch from `develop`, not `master`
- don't edit translation files except base.json, they will be replaced

# Donations

Donate with PayPal:  
[![Donate with PayPal](https://www.paypal.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=VE75PM997C2GW)  

Please note: donation does not imply any type of service contract.  


# License

[MIT](https://github.com/keeweb/keeweb/blob/master/LICENSE.txt)
