# Free cross-platform password manager compatible with KeePass

This webapp is a browser and desktop password manager compatible with KeePass databases. It doesn't require any server or additional resources.
The app can run either in browser, or as a desktop app.

![screenshot](img/screenshot.png)

## Quick Links

Apps: [Web](https://app.keeweb.info/), [Desktop](https://github.com/keeweb/keeweb/releases/latest)  
Timeline: [Release Notes](release-notes.md), [TODO](https://github.com/keeweb/keeweb/wiki/TODO)  
On one page: [Features](https://keeweb.info/#features), [FAQ](https://github.com/keeweb/keeweb/wiki/FAQ)  
Website: [keeweb.info](https://keeweb.info)  
Twitter: [kee_web](https://twitter.com/kee_web)  
Donate: [OpenCollective](https://opencollective.com/keeweb#support), [GitHub](https://github.com/sponsors/antelle)  

## Status

The app is quite stable now. Basic stuff, as well as more advanced operations, should be rather reliable.

## Self-hosting

Everything you need to host this app on your server is any static file server. The app is a single HTML file + a service worker (optionally; for offline access).
You can download the latest distribution files from [gh-pages](https://github.com/keeweb/keeweb/archive/gh-pages.zip) branch.  

If you are using Docker:

1. put your dh.pem, cert.pem, key.pem to /etc/nginx/external/ 
2. run this script:
```bash
docker run --name keeweb -d -p 443:443 -p 80:80 -v $EXT_DIR:/etc/nginx/external/ antelle/keeweb
```

To make Dropbox work in your self-hosted app, [go to this Wiki page](https://github.com/keeweb/keeweb/wiki/Dropbox-and-GDrive).

## Building

The easiest way to clone all KeeWeb repos is:
```bash
curl https://raw.githubusercontent.com/keeweb/keeweb/develop/dev-env.sh | bash -
```

The app can be built with grunt: `grunt` (html files will be in `dist/`).  
Desktop apps are built with `grunt desktop`. This requires some magic and currently works only on CI, 
you can find more details in [the GitHub Actions workflow](.github/workflows/build.yaml).  

To run the desktop (electron) app without building an installer, build the app with `grunt` and start it this way:
```bash
npm run dev
npm run electron
```

For debug build:

1. run `npm run dev`
2. open `http://localhost:8085`

To build desktop apps, use these goals, the result can be found in `tmp`:

```
npm run dev-desktop-macos
npm run dev-desktop-windows
npm run dev-desktop-linux
```

## Contributing

Please read contribution guidelines [for pull requests](.github/PULL_REQUEST_TEMPLATE.md).  
Here's a [list of issues](https://github.com/keeweb/keeweb/labels/help%20wanted) where your help would be very welcome.
Also you can help by [translating KeeWeb](https://keeweb.oneskyapp.com) to your language.  

Other ways of contribution can be found [on this page](CONTRIBUTING.md).

#### Important notes for pull requests

- please branch from `develop`, not `master`
- don't edit translation files except base.json, they will be replaced

## Donations

KeeWeb is not free to develop. It takes time, requires paid code signing certificates and domains.  
You can help the project or say "thank you" with this button:  
[<img src="https://opencollective.com/keeweb/tiers/backer.svg?avatarHeight=42&width=880" alt="OpenCollective">](https://opencollective.com/keeweb#support)

You can also sponsor the developer directly [on GitHub](https://github.com/sponsors/antelle).  

Please note: donation does not imply any type of service contract.  

## Thank you

Notable contributions to KeeWeb:

- Florian Reuschel ([@Loilo](https://github.com/Loilo)): [German translation](https://keeweb.oneskyapp.com/collaboration/translate/project/project/173183/language/550)
- Dennis Ploeger ([@dploeger](https://github.com/dploeger)): [auto-type improvements](https://github.com/keeweb/keeweb/pulls?q=is%3Apr+is%3Aclosed+author%3Adploeger)
- Hackmanit ([hackmanit.de](https://www.hackmanit.de)): [penetration test](https://www.hackmanit.de/en/blog-en/104-pro-bono-penetration-test-keeweb)
- Peter Bittner ([@bittner](https://github.com/bittner)): [Wikipedia article](https://en.wikipedia.org/wiki/KeeWeb)

## License

[MIT](https://github.com/keeweb/keeweb/blob/master/LICENSE)
