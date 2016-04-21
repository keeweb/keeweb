# KeeWeb official docker container
# https://keeweb.info
# (C) Antelle 2016, MIT license https://github.com/antelle/keeweb
# Based on nginx-ssl-secure https://github.com/MarvAmBass/docker-nginx-ssl-secure/

# docker build -t keeweb .
# docker run --name keeweb -d -p 443:443 keeweb

FROM nginx:stable
MAINTAINER Antelle "antelle.net@gmail.com"

# install
RUN apt-get -y update && apt-get -y install git openssl

# setup nginx
RUN rm -rf /etc/nginx/conf.d/*; \
    mkdir -p /etc/nginx/cert

RUN sed -i 's/access_log.*/access_log \/dev\/stdout;/g' /etc/nginx/nginx.conf; \
    sed -i 's/error_log.*/error_log \/dev\/stdout info;/g' /etc/nginx/nginx.conf; \
    sed -i 's/^pid/daemon off;\npid/g' /etc/nginx/nginx.conf

ADD keeweb.conf /etc/nginx/conf.d/keeweb.conf

ADD entrypoint.sh /opt/entrypoint.sh
RUN chmod a+x /opt/entrypoint.sh

ENTRYPOINT ["/opt/entrypoint.sh"]
CMD ["nginx"]

# clone keeweb
RUN git clone --depth 1 --single-branch --branch gh-pages https://github.com/antelle/keeweb.git

EXPOSE 443
