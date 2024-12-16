<div align="center">
<h6>Docker image for Keeweb</h6>
<h1>🔑 Keeweb Password Manager 🔑</h1>

<br />

The `docker/keeweb` branch contains the Keeweb password manager within a docker image, which allows you to host it within [Docker](https://docker.com), instead of a bare-metal or local install.

</p>

<br />

<img src="https://github.com/keeweb/keeweb/raw/master/img/screenshot.png" height="280">

<br />
<br />

</div>

<br />

<div align="center">

<!-- prettier-ignore-start -->
[![Version][github-version-img]][github-version-uri]
[![Docker Version][dockerhub-version-img]][dockerhub-version-uri]
[![Downloads][github-downloads-img]][github-downloads-uri]
[![Docker Pulls][dockerhub-pulls-img]][dockerhub-pulls-uri]
[![Build Status][github-build-img]][github-build-uri]
[![Size][github-size-img]][github-size-img]
[![Last Commit][github-commit-img]][github-commit-img]
<!-- prettier-ignore-end -->

</div>

<br />

---

<br />

- [About](#about)
- [Image Options](#image-options)
  - [Image Vendors](#image-vendors)
  - [Image Tags](#image-tags)
- [Install](#install)
  - [Docker Run](#docker-run)
  - [Docker Compose](#docker-compose)
  - [Traefik](#traefik)
    - [Dynamic.yml](#dynamicyml)
    - [Static.yml](#staticyml)
      - [certificatesResolvers](#certificatesresolvers)
      - [entryPoints (Normal)](#entrypoints-normal)
      - [entryPoints (Cloudflare)](#entrypoints-cloudflare)
- [Env Variables \& Volumes](#env-variables--volumes)
  - [Environment Variables](#environment-variables)
  - [Volumes](#volumes)
- [Build](#build)
  - [Troubleshooting](#troubleshooting)
    - [Permission Denied](#permission-denied)
- [Shell / Bash](#shell--bash)
- [SSL Certificates](#ssl-certificates)
- [Logs](#logs)

<br />

---

<br />

## About
This repository contains Keeweb Password Manager, distributed within a docker image which can be deployed and utilized in your browser.

<br />

---

<br />

## Image Options
Use any of the following images in your `docker-compose.yml` or `run` command:

<br />

### Image Vendors
You may pick from the following vendors:

<br />

| Service | Version | Image Link |
| --- | --- | --- |
| `Docker Hub` | [![Docker Version][dockerhub-version-ftb-img]][dockerhub-version-ftb-uri] | `keeweb/keeweb:latest` |
| `Github` | [![Github Version][github-version-ftb-img]][github-version-ftb-uri] | `ghcr.io/keeweb/keeweb:latest` |

<br />

### Image Tags
This repo includes a numerous options for the architecture:

<br />

| Tag | Description |
| --- | --- |
| `:latest` | Latest version of the `amd64` image |
| `:1.xx.x-amd64` | amd64 |
| `:1.xx.x-arm64` | arm64 / aarch64 |

<br />

---

<br />

## Install
Instructions on using this container

<br />

### Docker Run
If you want to bring the docker container up quickly, use the following command:

```shell
docker run -d --restart=unless-stopped -p 443:443 --name keeweb -v ${PWD}/keeweb:/config ghcr.io/keeweb/keeweb:latest
```

<br />

### Docker Compose
Create a new `docker-compose.yml` with the following:

```yml
services:
    keeweb:
        container_name: keeweb
        image: ghcr.io/keeweb/keeweb:latest          # Github image
      # image: keeweb/keeweb:latest                         # Dockerhub image
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

### Traefik
You can put this container behind Traefik if you want to use a reverse proxy and let Traefik handle the SSL certificate.

<br />

> [!NOTE]
> These steps are **optional**. 
> 
> If you do not use Traefik, you can skip this section of steps. This is only for users who wish to put this container behind Traefik.

<br />

#### Dynamic.yml
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
            rule: Host(`domain.localhost`) || Host(`keeweb.domain.com`)
            entryPoints:
                - http
            middlewares:
                - https-redirect@file

        keeweb-https:
            service: keeweb
            rule: Host(`domain.localhost`) || Host(`keeweb.domain.com`)
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

#### Static.yml
These entries will go in your Traefik `static.yml` file. Any changes made to this file requires that you reset Traefik afterward.

<br />

##### certificatesResolvers

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

##### entryPoints (Normal)
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

##### entryPoints (Cloudflare)
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

## Env Variables & Volumes
This section outlines that environment variables can be specified, and which volumes you can mount when the container is started.

<br />

### Environment Variables
The following env variables can be modified before spinning up this container:

<br />

| Env Var | Default | Description |
| --- | --- | --- |
| `PUID` | 1000 | <sub>User ID running the container</sub> |
| `PGID` | 1000 | <sub>Group ID running the container</sub> |
| `TZ` | Etc/UTC | <sub>Timezone</sub> |
| `PORT_HTTP` | 80 | <sub>Defines the HTTP port to run on</sub> |
| `PORT_HTTPS` | 443 | <sub>Defines the HTTPS port to run on</sub> |

<br />

### Volumes
The following volumes can be mounted with this container:

<br />

| Volume | Description |
| --- | --- |
| `./keeweb:/config` | <sub>Path which stores Keeweb, nginx configs, and optional SSL certificate/keys</sub> |

<br />

By mounting the volume above, you should now have access to the following folders:
<br />

| Folder | Description |
| --- | --- |
| `📁 keys` | <sub>Responsible for storing your ssl certificate `cert.crt` + key `cert.key`</sub> |
| `📁 log` | <sub>All nginx and php logs</sub> |
| `📁 nginx` | <sub>Contains `nginx.conf`, `resolver.conf`, `ssl.conf`, `site-confs`</sub> |
| `📁 php` | <sub>Contains `php-local.ini`, `www2.conf`</sub> |
| `📁 www` | <sub>Folder which stores the Keeweb files and images</sub> |

<br />

---

<br />

## Build
To build this image, utilize the following commands for both architectures. For the argument `VERSION`; specify the current release of alpine linux that is to be packaged within the docker image.

```shell ignore
docker build --build-arg VERSION=1.19.0 --build-arg BUILD_DATE=12.15.24 -t keeweb:latest -t keeweb:1.19.0 -t keeweb:1.19.0-amd64 -f Dockerfile .
```

<br />

### Troubleshooting
These are issues you may experience when building and deploying your own custom image.

<br />

#### Permission Denied

```console
Failed to open apk database: Permission denied
unable to exec /etc/s6-overlay/s6-rc.d/init-envfile/run: Permission denied
unable to exec /etc/s6-overlay/s6-rc.d/init-envfile/run: Permission denied
```

<br />

If you receive any type of `permission denied` error when running your custom image, you must ensure that certain files have executable `+x` (or `0755`) permissions. Once you fix the file permissions, re-build the image. A full list of files requiring elevated permissions are listed below:

```shell
sudo chmod +x /root/etc/s6-overlay/s6-rc.d/init-adduser/run
sudo chmod +x /root/etc/s6-overlay/s6-rc.d/init-crontab-config/run
sudo chmod +x /root/etc/s6-overlay/s6-rc.d/init-custom-files/run
sudo chmod +x /root/etc/s6-overlay/s6-rc.d/init-envfile/run
sudo chmod +x /root/etc/s6-overlay/s6-rc.d/init-folders/run
sudo chmod +x /root/etc/s6-overlay/s6-rc.d/init-keygen/run
sudo chmod +x /root/etc/s6-overlay/s6-rc.d/init-migrations/run
sudo chmod +x /root/etc/s6-overlay/s6-rc.d/init-nginx/run
sudo chmod +x /root/etc/s6-overlay/s6-rc.d/init-permissions/run
sudo chmod +x /root/etc/s6-overlay/s6-rc.d/init-php/run
sudo chmod +x /root/etc/s6-overlay/s6-rc.d/init-samples/run
sudo chmod +x /root/etc/s6-overlay/s6-rc.d/init-version-checks/run
sudo chmod +x /root/etc/s6-overlay/s6-rc.d/svc-cron/run
sudo chmod +x /root/etc/s6-overlay/s6-rc.d/svc-nginx/run
sudo chmod +x /root/etc/s6-overlay/s6-rc.d/svc-php-fpm/run
sudo chmod +x /run.sh
sudo chmod +x /download.sh
```

<br />

---

<br />

## Shell / Bash
You can access the docker container's shell by running:

```shell
docker exec -it keeweb ash
```

<br />

---

<br />

## SSL Certificates
This docker image automatically generates an SSL certificate when the nginx server is brought online. 

<br />

<p align="center"><img style="width: 85%;text-align: center;border: 1px solid #353535;" src="docs/img/002.png"></p>

<br />

You may opt to either use the generated self-signed certificate, or you can add your own. If you decide to use your own self-signed certificate, ensure you have mounted the `/config` volume in your `docker-compose.yml`:

```yml
services:
    keeweb:
        container_name: keeweb
        image: ghcr.io/keeweb/keeweb:latest    # Github image
        restart: unless-stopped
        volumes:
            - ./keeweb:/config
```

<br />

Then navigate to the newly mounted folder and add your `📄 cert.crt` and `🔑 cert.key` files to the `📁 /keeweb/keys/*` folder.

<br />

> [!NOTE]
> If you are generating your own certificate and key, we recommend a minimum of:
> - RSA: `2048 bits`
> - ECC: `256 bits`
> - ECDSA: `P-384 or P-521`

<br />

---

<br />

## Logs
This image spits out detailed information about its current progress. You can either use `docker logs` or a 3rd party app such as [Portainer](https://portainer.io/) to view the logs.

<br />

```shell
──────────────────────────────────────────────────────────────────────────────────────────
                              Keeweb Password Manager                             
──────────────────────────────────────────────────────────────────────────────────────────

  Thanks for choosing Keeweb. Get started with some of the links below:
        Official Repo           https://github.com/keeweb/keeweb
        Official Site           https://keeweb.info/
        Beta Demo               https://beta.keeweb.info/
        Web App                 https://app.keeweb.info/
        Favicon Service         https://services.keeweb.info/favicon

  If you are making this copy of Keeweb available on a public-facing domain,
  please consider using Traefik and Authentik to protect this container from
  outside access.

        User ID ........... 1000
        Group ID .......... 1000
        Port HTTP ......... 80
        Port HTTPS ........ 443

──────────────────────────────────────────────────────────────────────────────────────────

 SSL          : Using existing keys found in /config/keys
 Loader       : No custom files found, skipping...
 Core         : Completed loading container
```

<br />

---

<br />

<!-- BADGE > GENERAL -->
  [general-npmjs-uri]: https://npmjs.com
  [general-nodejs-uri]: https://nodejs.org
  [general-npmtrends-uri]: http://npmtrends.com/keeweb

<!-- BADGE > VERSION > GITHUB -->
  [github-version-img]: https://img.shields.io/github/v/tag/keeweb/keeweb?logo=GitHub&label=Version&color=ba5225
  [github-version-uri]: https://github.com/keeweb/keeweb/releases

<!-- BADGE > VERSION > GITHUB (For the Badge) -->
  [github-version-ftb-img]: https://img.shields.io/github/v/tag/keeweb/keeweb?style=for-the-badge&logo=github&logoColor=FFFFFF&logoSize=34&label=%20&color=ba5225
  [github-version-ftb-uri]: https://github.com/keeweb/keeweb/releases

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
  [github-build-img]: https://img.shields.io/github/actions/workflow/status/keeweb/keeweb/deploy-docker.yml?logo=github&logoColor=FFFFFF&label=Build&color=%23278b30
  [github-build-uri]: https://github.com/keeweb/keeweb/actions/workflows/deploy-docker.yml

<!-- BADGE > GITHUB > BUILD > Pypi -->
  [github-build-pypi-img]: https://img.shields.io/github/actions/workflow/status/keeweb/keeweb/release-pypi.yml?logo=github&logoColor=FFFFFF&label=Build&color=%23278b30
  [github-build-pypi-uri]: https://github.com/keeweb/keeweb/actions/workflows/pypi-release.yml

<!-- BADGE > GITHUB > TESTS -->
  [github-tests-img]: https://img.shields.io/github/actions/workflow/status/keeweb/keeweb/npm-tests.yml?logo=github&label=Tests&color=2c6488
  [github-tests-uri]: https://github.com/keeweb/keeweb/actions/workflows/npm-tests.yml

<!-- BADGE > GITHUB > COMMIT -->
  [github-commit-img]: https://img.shields.io/github/last-commit/keeweb/keeweb?logo=conventionalcommits&logoColor=FFFFFF&label=Last%20Commit&color=313131
  [github-commit-uri]: https://github.com/keeweb/keeweb/commits/main/

<!-- BADGE > DOCKER HUB > VERSION -->
  [dockerhub-version-img]: https://img.shields.io/docker/v/antelle/keeweb/latest?logo=docker&logoColor=FFFFFF&label=Docker%20Version&color=ba5225
  [dockerhub-version-uri]: https://hub.docker.com/repository/docker/antelle/keeweb/general

<!-- BADGE > DOCKER HUB > VERSION (For the Badge) -->
  [dockerhub-version-ftb-img]: https://img.shields.io/docker/v/antelle/keeweb/latest?style=for-the-badge&logo=docker&logoColor=FFFFFF&logoSize=34&label=%20&color=ba5225
  [dockerhub-version-ftb-uri]: https://hub.docker.com/repository/docker/antelle/keeweb/tags

<!-- BADGE > DOCKER HUB > PULLS -->
  [dockerhub-pulls-img]: https://img.shields.io/docker/pulls/antelle/keeweb?logo=docker&logoColor=FFFFFF&label=Docker%20Pulls&color=af9a00
  [dockerhub-pulls-uri]: https://hub.docker.com/repository/docker/antelle/keeweb/general

