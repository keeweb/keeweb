<div align="center">
<h6>Password Manager</h6>
<h1>KeeWeb Password Manager🔑</h1>

<br />

<p>
KeeWeb is a browser and desktop password manager which is capable of opening up existing KeePass database `kdbx` files, or creating new vaults to store your important credentials in.
</p>

<p align="center"><img style="width: 80%;text-align: center;" src="img/screenshot.png"></p>

<br />
<br />

</div>

<div align="center">

<!-- prettier-ignore-start -->
[![Version][github-version-img]][github-version-uri]
[![Tests][github-tests-img]][github-tests-uri]
[![Downloads][github-downloads-img]][github-downloads-uri]
[![Size][github-size-img]][github-size-img]
[![Last Commit][github-commit-img]][github-commit-img]
[![Contributors][contribs-all-img]](#contributors-)

</div>

<br />

---

<br />

- [About](#about)
  - [Quick Links](#quick-links)
- [Self-hosting](#self-hosting)
  - [Docker:](#docker)
    - [Run](#run)
    - [Compose](#compose)
    - [Traefik](#traefik)
      - [Dynamic.yml](#dynamicyml)
      - [Static.yml](#staticyml)
        - [certificatesResolvers](#certificatesresolvers)
        - [entryPoints (Normal)](#entrypoints-normal)
        - [entryPoints (Cloudflare)](#entrypoints-cloudflare)
  - [Env \& Volumes](#env--volumes)
    - [Env Variables](#env-variables)
    - [Volumes](#volumes)
  - [Dropbox Support](#dropbox-support)
- [Build From Source](#build-from-source)
  - [Platform: Windows](#platform-windows)
    - [Using Grunt](#using-grunt)
    - [Using NPM](#using-npm)
  - [Platform: Linux](#platform-linux)
    - [Using Grunt](#using-grunt-1)
    - [Using NPM](#using-npm-1)
  - [Platform: MacOS](#platform-macos)
    - [Using Grunt](#using-grunt-2)
    - [Using NPM](#using-npm-2)
- [Donations](#donations)
- [Contributors ✨](#contributors-)

<br />

---

<br />

## About

**KeeWeb** is a password manager which supports managing `kdbx` files created by other applications such as KeePass, KeePassXC, etc. You choose the platform you wish to run; as KeeWeb supports being installed and ran as either a Desktop application, or in your web-browser.

<br />

With support for Linux, Windows, and MacOS, we give you the tools to seamlessly manage your most important credentials across multiple applications and platforms.

<br />

Decide how you want to save your credential vault, KeeWeb supports saving your database as a local file, or you can store your password vault with some of the most popular cloud services such as Dropbox, Google Drive, and Microsoft OneDrive.

<br />

### Quick Links

Review some of our most important links below to learn more about KeeWeb and who we are:

<br />

Apps: [Web](https://app.keeweb.info/), [Desktop](https://github.com/keeweb/keeweb/releases/latest)  
Timeline: [Release Notes](release-notes.md), [TODO](https://github.com/keeweb/keeweb/wiki/TODO)  
On one page: [Features](https://keeweb.info/#features), [FAQ](https://github.com/keeweb/keeweb/wiki/FAQ)  
Website: [keeweb.info](https://keeweb.info)  
Twitter: [kee_web](https://twitter.com/kee_web)  
Donate: [OpenCollective](https://opencollective.com/keeweb#support), [GitHub](https://github.com/sponsors/antelle)

<br />

---

<br />

## Self-hosting

Want to self-host your copy of KeeWeb? Everything you need to host this app on your server is provided within the package. KeeWeb itself is a single HTML file combined with a service worker (optionally; for offline access).

<br />

You can download the latest distribution files from [gh-pages](https://github.com/keeweb/keeweb/archive/gh-pages.zip) branch.

<br />

### Docker:

If you wish to host Keeweb within a Docker container, we provide pre-built images that you can pull into your environment.

<br />

#### Run
If you want to bring the docker container up quickly, use the following command:

```shell
docker run -d --restart=unless-stopped -p 443:443 --name keeweb -v ${PWD}/keeweb:/config ghcr.io/keeweb/keeweb:latest
```

<br />

#### Compose
Create a new `docker-compose.yml` with the following:

```yml
services:
    keeweb:
        container_name: keeweb
        image: ghcr.io/keeweb/keeweb:latest       # Github image
      # image: keeweb/keeweb:latest               # Dockerhub image
        restart: unless-stopped
        volumes:
            - ./keeweb:/config
        environment:
            - PUID=1000
            - PGID=1000
            - TZ=Etc/UTC
```

<br />

<br />

#### Traefik
You can put this container behind Traefik if you want to use a reverse proxy and let Traefik handle the SSL certificate.

<br />

> [!NOTE]
> These steps are **optional**. 
> 
> If you do not use Traefik, you can skip this section of steps. This is only for users who wish to put this container behind Traefik.

<br />

##### Dynamic.yml
Open the Traefik dynamic file which is usually named `dynamic.yml`. We need to add a new `middleware`, `router`, and `service` to our Traefik dynamic file so that it knows about our new Keeweb container and where it is.

```yml
http:
    middlewares:
        https-redirect:
            redirectScheme:
                scheme: "https"
                permanent: true

    routers:
        keeweb-http:
            service: keeweb
            rule: Host(`keeweb.localhost`) || Host(`keeweb.domain.com`)
            entryPoints:
                - http
            middlewares:
                - https-redirect@file

        keeweb-https:
            service: keeweb
            rule: Host(`keeweb.localhost`) || Host(`keeweb.domain.com`)
            entryPoints:
                - https
            tls:
                certResolver: cloudflare
                domains:
                    - main: "domain.com"
                      sans:
                          - "*.domain.com"

    services:
        keeweb:
            loadBalancer:
                servers:
                    - url: "https://keeweb:443"
```

<br />

##### Static.yml
These entries will go in your Traefik `static.yml` file. Any changes made to this file requires that you reset Traefik afterward.

<br />

###### certificatesResolvers

Open your Traefik `static.yml` file and add your `certResolver` from above. We are going to use Cloudflare in this exmaple, you can use whatever from the list at:
- https://doc.traefik.io/traefik/https/acme/#providers

<br />

```yml
certificatesResolvers:
    cloudflare:
        acme:
            email: youremail@address.com
            storage: /cloudflare/acme.json
            keyType: EC256
            preferredChain: 'ISRG Root X1'
            dnsChallenge:
                provider: cloudflare
                delayBeforeCheck: 15
                resolvers:
                    - "1.1.1.1:53"
                    - "1.0.0.1:53"
                disablePropagationCheck: true
```

<br />

Once you pick the DNS / SSL provider you want to use from the code above, you need to see if that provider has any special environment variables that must be set. The [Providers Page](https://doc.traefik.io/traefik/https/acme/#providers) lists all providers and also what env variables need set for each one.

<br />

In our example, since we are using Cloudflare for `dnsChallenge` -> `provider`, we must set:
- `CF_API_EMAIL`
- `CF_API_KEY`

<br />

Create a `.env` environment file in the same folder where your Traefik `docker-compose.yml` file is located, and add the following:

```yml
CF_API_EMAIL=yourcloudflare@email.com
CF_API_KEY=Your-Cloudflare-API-Key
```

<br />

Save the `.env` file and exit.

<br />

###### entryPoints (Normal)
Finally, inside the Traefik `static.yml`, we need to make sure we have our `entryPoints` configured. Add the following to the Traefik `static.yml` file only if you **DON'T** have entry points set yet:

```yml
entryPoints:
    http:
        address: :80
        http:
            redirections:
                entryPoint:
                    to: https
                    scheme: https

    https:
        address: :443
        http3: {}
        http:
            tls:
                options: default
                certResolver: cloudflare
                domains:
                    - main: domain.com
                      sans:
                          - '*.domain.com'
```

<br />

###### entryPoints (Cloudflare)
If your website is behind Cloudflare's proxy service, you need to modify your `entryPoints` above so that you can automatically allow Cloudflare's IP addresses through. This means your entry points will look a bit different.

<br />

In the example below, we will add `forwardedHeaders` -> `trustedIPs` and add all of Cloudflare's IPs to the list which are available here:
- https://cloudflare.com/ips/

```yml
    http:
        address: :80
        forwardedHeaders:
            trustedIPs: &trustedIps
                - 103.21.244.0/22
                - 103.22.200.0/22
                - 103.31.4.0/22
                - 104.16.0.0/13
                - 104.24.0.0/14
                - 108.162.192.0/18
                - 131.0.72.0/22
                - 141.101.64.0/18
                - 162.158.0.0/15
                - 172.64.0.0/13
                - 173.245.48.0/20
                - 188.114.96.0/20
                - 190.93.240.0/20
                - 197.234.240.0/22
                - 198.41.128.0/17
                - 2400:cb00::/32
                - 2606:4700::/32
                - 2803:f800::/32
                - 2405:b500::/32
                - 2405:8100::/32
                - 2a06:98c0::/29
                - 2c0f:f248::/32
        http:
            redirections:
                entryPoint:
                    to: https
                    scheme: https

    https:
        address: :443
        http3: {}
        forwardedHeaders:
            trustedIPs: *trustedIps
        http:
            tls:
                options: default
                certResolver: cloudflare
                domains:
                    - main: domain.com
                      sans:
                          - '*.domain.com'
```

<br />

Save the files and then give Traefik and your Keeweb containers a restart.

<br />

---

<br />

### Env & Volumes
This section outlines that environment variables can be specified, and which volumes you can mount when the container is started.

<br />

#### Env Variables
The following env variables can be modified before spinning up this container:

<br />

| Env Var | Default | Description |
| --- | --- | --- |
| `PUID`        | 1000      | <sub>User ID running the container</sub> |
| `PGID`        | 1000      | <sub>Group ID running the container</sub> |
| `TZ`          | Etc/UTC   | <sub>Timezone</sub> |
| `PORT_HTTP`   | 80        | <sub>Defines the HTTP port to run on</sub> |
| `PORT_HTTPS`  | 443       | <sub>Defines the HTTPS port to run on</sub> |

<br />

#### Volumes
The following volumes can be mounted with this container:

<br />

| Volume | Description |
| ---- | ---- |
| `./keeweb:/config` | <sub>Path which stores Keeweb, nginx configs, and optional SSL certificate/keys</sub> |

<br />

By mounting the volume above, you should now have access to the following folders:
<br />

| Folder | Description |
| ---- | ---- |
| `📁 keys`   | <sub>Responsible for storing your ssl certificate `cert.crt` + key `cert.key`</sub> |
| `📁 log`    | <sub>All nginx / container logs</sub> |
| `📁 nginx`  | <sub>Contains `nginx.conf`, `resolver.conf`, `ssl.conf`, `site-confs`</sub> |
| `📁 www`    | <sub>Folder which stores the Keeweb files and images</sub> |

<br />

### Dropbox Support

To configure Dropbox support on your self-hosted setup [view our Wiki page](https://github.com/keeweb/keeweb/wiki/Dropbox-and-GDrive).

<br />

---

<br />

## Build From Source

The easiest way to clone all KeeWeb repos is:

```bash
curl https://raw.githubusercontent.com/keeweb/keeweb/develop/dev-env.sh | bash -
```

<br />

KeeWeb can be built utilizing the **grunt commandline**. Each platform has multiple commands you can use; pick one:

<br />

### Platform: Windows

You may build KeeWeb for `Windows` by executing ONE of the following two commands provided:

<br />

#### Using Grunt

```shell
grunt dev-desktop-win32 --skip-sign
```

<br />

#### Using NPM

```shell
npm run dev-desktop-windows
```

<br />

### Platform: Linux

You may build KeeWeb for `Linux` by executing ONE of the following two commands provided:

<br />

#### Using Grunt

```shell
grunt dev-desktop-linux --skip-sign
```

<br />

#### Using NPM

```shell
npm run dev-desktop-linux
```

<br />
<br />

### Platform: MacOS

You may build KeeWeb for `MacOS` by executing ONE of the following two commands provided:

#### Using Grunt

```shell
grunt dev-desktop-darwin --skip-sign
```

#### Using NPM

```shell
npm run dev-desktop-macos
```

<br />

Once the build is complete, all (html files will be in `dist/` folder. To build KeeWeb, utilize the following commands below.

<br />

To run the desktop (electron) app without building an installer, build the app with `grunt` and then launch KeeWeb with one of the following commands:

<br />

```bash
npm run dev
npm run electron
```

<br />

To debug your build:

1. run `npm run dev`
2. open `http://localhost:8085`

<br />

Once built, the output files will be generated in `tmp`:

<br />

---

<br />

## Donations

KeeWeb is not free to develop. It takes time, requires paid code signing certificates and domains.  
You can help the project or say "thank you" with this button:  
[<img src="https://opencollective.com/keeweb/tiers/backer.svg?avatarHeight=42&width=880" alt="OpenCollective">](https://opencollective.com/keeweb#support)

<br />

You can also sponsor the developer directly [on GitHub](https://github.com/sponsors/antelle).

<br />

Please note: donation does not imply any type of service contract.

<br />

---

<br />

## Contributors ✨
We are always looking for contributors. If you feel that you can provide something useful to Gistr, then we'd love to review your suggestion. Before submitting your contribution, please review the following resources:

- [Pull Request Procedure](.github/PULL_REQUEST_TEMPLATE.md)
- [Contributor Policy](CONTRIBUTING.md)

<br />

Want to help but can't write code?
- Review [active questions by our community](https://github.com/keeweb/keeweb/labels/help%20wanted) and answer the ones you know.

<br />

![Alt](https://repobeats.axiom.co/api/embed/7dc2a7ce8b8a09bc63114defdc7ccb9d91bbd352.svg "Analytics image")

Want to help but can't write code?

- Review [active questions by our community](https://github.com/keeweb/keeweb/labels/help%20wanted) and answer the ones you know.
- Help [translating KeeWeb](https://keeweb.oneskyapp.com)

<br />

<div align="center">

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![Contributors][contribs-all-img]](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://gitlab.com/antelle"><img src="https://avatars.githubusercontent.com/u/633557?v=4?s=40" width="40px;" alt="Antelle"/><br /><sub><b>Antelle</b></sub></a><br /><a href="https://github.com/KeeWeb/KeeWeb/commits?author=antelle" title="Code">💻</a> <a href="#projectManagement-antelle" title="Project Management">📆</a> <a href="#fundingFinding-antelle" title="Funding Finding">🔍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://gitlab.com/Aetherinox"><img src="https://avatars.githubusercontent.com/u/118329232?v=4?s=40" width="40px;" alt="Aetherinox"/><br /><sub><b>Aetherinox</b></sub></a><br /><a href="https://github.com/KeeWeb/KeeWeb/commits?author=Aetherinox" title="Code">💻</a> <a href="#projectManagement-Aetherinox" title="Project Management">📆</a> <a href="#fundingFinding-Aetherinox" title="Funding Finding">🔍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://gitlab.com/HarlemSquirrel"><img src="https://avatars.githubusercontent.com/u/6445815?v=4?s=40" width="40px;" alt="HarlemSquirrel"/><br /><sub><b>HarlemSquirrel</b></sub></a><br /><a href="https://github.com/KeeWeb/KeeWeb/commits?author=HarlemSquirrel" title="Code">💻</a> <a href="#projectManagement-HarlemSquirrel" title="Project Management">📆</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

<br />
<br />

---

<br />

<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

<!-- BADGE > GENERAL -->
  [general-npmjs-uri]: https://npmjs.com
  [general-nodejs-uri]: https://nodejs.org
  [general-npmtrends-uri]: http://npmtrends.com/keeweb

<!-- BADGE > VERSION > GITHUB -->
  [github-version-img]: https://img.shields.io/github/v/tag/keeweb/keeweb?logo=GitHub&label=Version&color=ba5225
  [github-version-uri]: https://github.com/keeweb/keeweb/releases

<!-- BADGE > VERSION > NPMJS -->
  [npm-version-img]: https://img.shields.io/npm/v/keeweb?logo=npm&label=Version&color=ba5225
  [npm-version-uri]: https://npmjs.com/package/keeweb

<!-- BADGE > VERSION > PYPI -->
  [pypi-version-img]: https://img.shields.io/pypi/v/keeweb
  [pypi-version-uri]: https://pypi.org/project/keeweb/

<!-- BADGE > LICENSE > MIT -->
  [license-mit-img]: https://img.shields.io/badge/MIT-FFF?logo=creativecommons&logoColor=FFFFFF&label=License&color=9d29a0
  [license-mit-uri]: https://github.com/keeweb/keeweb/blob/main/LICENSE

<!-- BADGE > GITHUB > DOWNLOAD COUNT -->
  [github-downloads-img]: https://img.shields.io/github/downloads/keeweb/keeweb/total?logo=github&logoColor=FFFFFF&label=Downloads&color=376892
  [github-downloads-uri]: https://github.com/keeweb/keeweb/releases

<!-- BADGE > NPMJS > DOWNLOAD COUNT -->
  [npmjs-downloads-img]: https://img.shields.io/npm/dw/%40keeweb%2Fkeeweb?logo=npm&&label=Downloads&color=376892
  [npmjs-downloads-uri]: https://npmjs.com/package/keeweb

<!-- BADGE > GITHUB > DOWNLOAD SIZE -->
  [github-size-img]: https://img.shields.io/github/repo-size/keeweb/keeweb?logo=github&label=Size&color=59702a
  [github-size-uri]: https://github.com/keeweb/keeweb/releases

<!-- BADGE > NPMJS > DOWNLOAD SIZE -->
  [npmjs-size-img]: https://img.shields.io/npm/unpacked-size/keeweb/latest?logo=npm&label=Size&color=59702a
  [npmjs-size-uri]: https://npmjs.com/package/keeweb

<!-- BADGE > CODECOV > COVERAGE -->
  [codecov-coverage-img]: https://img.shields.io/codecov/c/github/keeweb/keeweb?token=MPAVASGIOG&logo=codecov&logoColor=FFFFFF&label=Coverage&color=354b9e
  [codecov-coverage-uri]: https://codecov.io/github/keeweb/keeweb

<!-- BADGE > ALL CONTRIBUTORS -->
  [contribs-all-img]: https://img.shields.io/github/all-contributors/keeweb/keeweb?logo=contributorcovenant&color=de1f6f&label=contributors
  [contribs-all-uri]: https://github.com/all-contributors/all-contributors

<!-- BADGE > GITHUB > BUILD > NPM -->
  [github-build-img]: https://img.shields.io/github/actions/workflow/status/keeweb/keeweb/release-build.yml?logo=github&logoColor=FFFFFF&label=Build&color=%23278b30
  [github-build-uri]: https://github.com/keeweb/keeweb/actions/workflows/release-build.yml

<!-- BADGE > GITHUB > BUILD > Pypi -->
  [github-build-pypi-img]: https://img.shields.io/github/actions/workflow/status/keeweb/keeweb/release-pypi.yml?logo=github&logoColor=FFFFFF&label=Build&color=%23278b30
  [github-build-pypi-uri]: https://github.com/keeweb/keeweb/actions/workflows/release-pypi.yml

<!-- BADGE > GITHUB > TESTS -->
  [github-tests-img]: https://img.shields.io/github/actions/workflow/status/keeweb/keeweb/tests.yml?logo=github&label=Tests&color=2c6488
  [github-tests-uri]: https://github.com/keeweb/keeweb/actions/workflows/tests.yml

<!-- BADGE > GITHUB > COMMIT -->
  [github-commit-img]: https://img.shields.io/github/last-commit/keeweb/keeweb?logo=conventionalcommits&logoColor=FFFFFF&label=Last%20Commit&color=313131
  [github-commit-uri]: https://github.com/keeweb/keeweb/commits/main/

<!-- prettier-ignore-end -->
<!-- markdownlint-restore -->
