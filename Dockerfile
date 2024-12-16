# syntax=docker/dockerfile:1

# #
#   @project        keeweb
#   @usage          keeweb docker image
#   @file           Dockerfile
#   @repo           https://github.com/keeweb/keeweb
#                   https://github.com/keeweb/docker-alpine-base
#                   https://hub.docker.com/repository/docker/keeweb/keeweb
#                   https://hub.docker.com/repository/docker/aetherinox/alpine-base
# #

FROM ghcr.io/keeweb/alpine-base:3.20-amd64

# #
#   Set Args
# #

ARG BUILD_DATE
ARG VERSION
ARG NGINX_VERSION

# #
#   Set Labels
# #

LABEL maintainer="Aetherinox"
LABEL org.opencontainers.image.authors="Aetherinox"
LABEL org.opencontainers.image.vendor="Keeweb"
LABEL org.opencontainers.image.title="Keeweb Password Manager"
LABEL org.opencontainers.image.description="Keeweb password manager"
LABEL org.opencontainers.image.source="https://github.com/keeweb/keeweb"
LABEL org.opencontainers.image.documentation="https://github.com/keeweb/keeweb"
LABEL org.opencontainers.image.url="https://github.com/keeweb/keeweb/pkgs/container/keeweb"
LABEL org.opencontainers.image.licenses="MIT"
LABEL build_version="Keeweb v${VERSION} build-date: ${BUILD_DATE}"

# #
#   Set Env Var
# #

ENV TZ="Etc/UTC"
ENV URL_REPO_BASE="https://github.com/keeweb/docker-alpine-base/pkgs/container/alpine-base"
ENV URL_REPO_APP="https://github.com/keeweb/keeweb/pkgs/container/keeweb"
ENV FILE_NAME="index.html"
ENV PORT_HTTP=80
ENV PORT_HTTPS=443

# #
#   Install
# #

RUN \
  if [ -z ${NGINX_VERSION+x} ]; then \
      NGINX_VERSION=$(curl -sL "http://dl-cdn.alpinelinux.org/alpine/v3.20/main/x86_64/APKINDEX.tar.gz" | tar -xz -C /tmp \
      && awk '/^P:nginx$/,/V:/' /tmp/APKINDEX | sed -n 2p | sed 's/^V://'); \
  fi && \
  apk add --no-cache \
      wget \
      logrotate \
      openssl \
      apache2-utils \
      nginx==${NGINX_VERSION} \
      nginx-mod-http-fancyindex==${NGINX_VERSION} && \
  echo "**** Install Build Packages ****" && \
  echo "**** Configure Nginx ****" && \
  echo 'fastcgi_param  HTTP_PROXY         ""; # https://httpoxy.org/' >> \
      /etc/nginx/fastcgi_params && \
  echo 'fastcgi_param  PATH_INFO          $fastcgi_path_info; # http://nginx.org/en/docs/http/ngx_http_fastcgi_module.html#fastcgi_split_path_info' >> \
      /etc/nginx/fastcgi_params && \
  echo 'fastcgi_param  SCRIPT_FILENAME    $document_root$fastcgi_script_name; # https://www.nginx.com/resources/wiki/start/topics/examples/phpfcgi/#connecting-nginx-to-php-fpm' >> \
      /etc/nginx/fastcgi_params && \
  echo 'fastcgi_param  SERVER_NAME        $host; # Send HTTP_HOST as SERVER_NAME. If HTTP_HOST is blank, send the value of server_name from nginx (default is `_`)' >> \
      /etc/nginx/fastcgi_params && \
  rm -f /etc/nginx/http.d/default.conf && \
  rm -f /etc/nginx/conf.d/stream.conf && \
  rm -f /config/www/index.html && \
  echo "**** Setup Logrotate ****" && \
  sed -i "s#/var/log/messages {}.*# #g" \
      /etc/logrotate.conf && \
  sed -i 's#/usr/sbin/logrotate /etc/logrotate.conf#/usr/sbin/logrotate /etc/logrotate.conf -s /config/log/logrotate.status#g' \
      /etc/periodic/daily/logrotate

# #
#   Set work directory
# #

WORKDIR /config/www

# #
#   Add local files
# #

COPY root/ /

# #
#   Ports and volumes
# #

EXPOSE ${PORT_HTTP} ${PORT_HTTPS}

# #
#   In case user sets up the cron for a longer duration, do a first run
#   and then keep the container running. Hacky, but whatever.
# #

# CMD ["sh", "-c", "/run.sh ; /task.sh ; tail -f /dev/null"]
