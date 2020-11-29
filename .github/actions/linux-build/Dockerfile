FROM snapcore/snapcraft:stable

COPY entrypoint.sh /entrypoint.sh

RUN apt-get update
RUN apt-get install -y build-essential git-core unzip curl pkg-config rpm
RUN curl -sL https://deb.nodesource.com/setup_15.x | sudo -E bash -
RUN apt-get install -y nodejs
RUN npm i -g grunt-cli

ENTRYPOINT ["/entrypoint.sh"]
