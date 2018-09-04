FROM node:8 AS builder

ENV NODE_ENV=production

RUN apt-get update && \
    apt-get --assume-yes upgrade

RUN groupadd --gid 1100 lisk && \
    useradd --create-home --home-dir /home/lisk --shell /bin/bash --uid 1100 --gid 1100 lisk
COPY --chown=lisk:lisk . /home/lisk/lisk/

USER lisk
WORKDIR /home/lisk/lisk

RUN npm install


FROM node:8

ENV NODE_ENV=production
ENV WFI_SHA=0f75de5c9d9c37a933bb9744ffd710750d5773892930cfe40509fa505788835c

RUN echo "deb http://ftp.debian.org/debian jessie-backports main" >/etc/apt/sources.list.d/backports.list && \
    apt-get update && \
    apt-get --assume-yes upgrade && \
    apt-get --assume-yes install --target-release=jessie-backports jq

RUN groupadd --gid 1100 lisk && \
    useradd --create-home --home-dir /home/lisk --shell /bin/bash --uid 1100 --gid 1100 lisk
COPY --from=builder --chown=lisk:lisk /home/lisk/lisk/ /home/lisk/lisk/
# git repository needed for build; cannot be added to .dockerignore
RUN rm -rf /home/lisk/lisk/.git && \
    mkdir /home/lisk/lisk/logs && \
    chown lisk:lisk /home/lisk/lisk/logs

ADD https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh /home/lisk/wait-for-it.sh
RUN if [ x"$( sha256sum /home/lisk/wait-for-it.sh |awk '{print $1}' )" = x"${WFI_SHA}" ]; then \
      chmod 0755 /home/lisk/wait-for-it.sh; \
    else \
      rm -f /home/lisk/wait-for-it.sh; \
      echo "Checksum verification failed."; \
      exit 1; \
    fi

ENV LISK_API_WHITELIST=127.0.0.1
ENV LISK_FORGING_WHITELIST=${LISK_API_WHITELIST}

USER lisk
WORKDIR /home/lisk/lisk

ENTRYPOINT ["node", "/home/lisk/lisk/app.js"]
CMD ["-n", "mainnet"]
