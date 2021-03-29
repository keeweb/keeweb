#!/bin/bash

echo "Welcome to KeeWeb docker container!"

if [ -z ${DH_SIZE+x} ]
then
  >&2 echo ">> no \$DH_SIZE specified using default"
  DH_SIZE="512"
fi


DH="/etc/nginx/external/dh.pem"

if [ ! -e "$DH" ]
then
  echo ">> seems like the first start of nginx"
  echo ">> doing some preparations..."
  echo ""

  echo ">> generating $DH with size: $DH_SIZE"
  openssl dhparam -out "$DH" $DH_SIZE
fi

if [ ! -e "/etc/nginx/external/cert.pem" ] || [ ! -e "/etc/nginx/external/key.pem" ]
then
  echo ">> generating self signed cert"
  openssl req -x509 -newkey rsa:4086 \
  -subj "/C=XX/ST=XXXX/L=XXXX/O=XXXX/CN=localhost" \
  -keyout "/etc/nginx/external/key.pem" \
  -out "/etc/nginx/external/cert.pem" \
  -days 3650 -nodes -sha256
fi

if [ ${KEEWEB_CONFIG_URL} ]
then
  sed -i "s,(no-config),${KEEWEB_CONFIG_URL}," /keeweb/index.html
fi

# exec CMD
echo ">> exec docker CMD"
echo "$@"
# exec "$@"

if [ -n "${WEBDAV_USERNAME:-}" ] && [ -n "${WEBDAV_PASSWORD:-}" ]; then
    htpasswd -cb /etc/nginx/webdavpasswd $WEBDAV_USERNAME $WEBDAV_PASSWORD
else
    echo "No htpasswd config done"
    sed -i 's%auth_basic "Restricted";% %g' /etc/nginx/nginx.conf
    sed -i 's%auth_basic_user_file webdavpasswd;% %g' /etc/nginx/nginx.conf
fi

#UID="${UID:-$(id -u nginx)}"
GID="${GID:-$(id -g nginx)}"
gosu $UID chmod go+w /dev/stderr /dev/stdout
gosu $UID mkdir -p /media/store/.tmp
cp -u /keeweb/Demo.kdbx /media/store/Demo.kdbx
gosu $UID chown -R $GID:$GID /media/store
gosu $UID chmod -R a+rw /media/store
exec gosu $UID "$@"

