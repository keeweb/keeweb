# About
This repository contains the base docker alpine image that is utilized to create our releases for the [Keeweb](https://keeweb.info/) password manager. Users wishing to utilize Keeweb in a docker container should not have to download or use the files contained in this repository, as they are only used on the back-end.

<br />

This repository contains builds for the following architectures:

| Architecture | Dockerfile |
| --- | --- |
| **amd64** | `Dockerfile` |
| **arm64** | `Dockerfile.aarch64` |

<br />

---

<br />

## Build
To build this image, utilize the following commands for both architectures. For the argument `VERSION`; specify the current release of alpine linux that is to be packaged within the docker image.

```shell ignore
docker build --build-arg VERSION=3.20 --build-arg BUILD_DATE=12.15.24 -t docker-alpine-base:latest -t docker-alpine-base:3.20-amd64 -f Dockerfile .
docker build --build-arg VERSION=3.20 --build-arg BUILD_DATE=12.15.24 -t docker-alpine-base:3.20-arm64 -f Dockerfile.aarch64 .
```

<br />

After the build is complete, you can now use this docker image as a base for the official Keeweb docker image within your `Dockerfile`:

```dockerfile
FROM ghcr.io/keeweb/alpine-base:3.20-amd64
```
