# KeeWeb official docker container
# https://keeweb.info
# (C) Antelle 2019, MIT license https://github.com/keeweb/keeweb
# Based on nginx-ssl-secure https://github.com/MarvAmBass/docker-nginx-ssl-secure/

# Building locally:
# docker build -t keeweb .
# docker run --name keeweb -d -p 443:443 -p 80:80 -e 'DH_SIZE=512' -v $EXT_DIR:/etc/nginx/external/ keeweb

# Using pre-built image from dockerhub:
# If you have SSL certs, put your dh.pem, cert.pem, key.pem to /etc/nginx/external/ and run with:
# docker run --name keeweb -d -p 443:443 -p 80:80 -v $EXT_DIR:/etc/nginx/external/ antelle/keeweb
# Or, to generate self-signed cert, run:
# docker run --name keeweb -d -p 443:443 -p 80:80 -e 'DH_SIZE=512' antelle/keeweb

FROM armhf/alpine:latest
MAINTAINER Antelle "antelle.net@gmail.com"

# install nginx
RUN apk add --no-cache bash nginx && \
    mkdir -p /run/nginx/

# install
RUN apk add --no-cache openssl wget unzip ca-certificates

# setup nginx
RUN rm -rf /etc/nginx/conf.d/*; \
    mkdir -p /etc/nginx/external

RUN sed -i 's/access_log.*/access_log \/dev\/stdout;/g' /etc/nginx/nginx.conf; \
    sed -i 's/error_log.*/error_log \/dev\/stdout info;/g' /etc/nginx/nginx.conf; \
    sed -i 's/error_log \/dev\/stdout info;/error_log \/dev\/stdout info;\n\n# daemon mode off\ndaemon off;/g' /etc/nginx/nginx.conf

COPY keeweb.conf /etc/nginx/conf.d/keeweb.conf

# clone keeweb
RUN wget https://github.com/keeweb/keeweb/archive/gh-pages.zip; \
    unzip gh-pages.zip; \
    rm gh-pages.zip; \
    mv keeweb-gh-pages keeweb;

# clone keeweb plugins
RUN wget https://github.com/keeweb/keeweb-plugins/archive/master.zip; \
    unzip master.zip; \
    rm master.zip; \
    mv keeweb-plugins-master/docs keeweb/plugins; \
    rm -rf keeweb-plugins-master;

COPY entrypoint.sh /opt/entrypoint.sh
RUN chmod a+x /opt/entrypoint.sh

ENTRYPOINT ["/opt/entrypoint.sh"]
CMD ["nginx"]

EXPOSE 443
EXPOSE 80
