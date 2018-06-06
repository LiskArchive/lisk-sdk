FROM node:6 AS builder

ENV NODE_ENV=production

RUN apt-get update && \
    apt-get --assume-yes upgrade

RUN groupadd --gid 1100 lisk && \
    useradd --create-home --home-dir /home/lisk --shell /bin/bash --uid 1100 --gid 1100 lisk
# As of June 2018 cloud.docker.com runs docker 17.06.2-ee-6
# however version 17.12 is required to use the chown flag
COPY . /home/lisk/lisk/
RUN chown lisk:lisk --recursive /home/lisk/lisk

USER lisk
WORKDIR /home/lisk/lisk

RUN npm install


FROM node:6

ENV CONFD_VERSION 0.16.0
ENV CONFD_SHA256 255d2559f3824dd64df059bdc533fd6b697c070db603c76aaf8d1d5e6b0cc334
ENV NODE_ENV=production

RUN apt-get update && \
    apt-get --assume-yes upgrade && \
    apt-get --assume-yes install jq

RUN groupadd --gid 1100 lisk && \
    useradd --create-home --home-dir /home/lisk --shell /bin/bash --uid 1100 --gid 1100 lisk
COPY --from=builder /home/lisk/lisk/ /home/lisk/lisk/
COPY docker_files/ /
# git repository needed for build; cannot be added to .dockerignore
RUN rm -rf /home/lisk/lisk/.git && \
    mkdir /home/lisk/lisk/logs && \
    chown lisk:lisk --recursive /home/lisk/lisk

RUN curl --silent --show-error --location --output /tmp/confd \
         https://github.com/kelseyhightower/confd/releases/download/v${CONFD_VERSION}/confd-${CONFD_VERSION}-linux-amd64 && \
    if [ x"$( sha256sum /tmp/confd |awk '{ print $1 }' )" = x"${CONFD_SHA256}" ]; then \
        mv /tmp/confd /usr/local/bin/; \
	chmod +x /usr/local/bin/confd; \
    else \
        rm -f /tmp/confd; \
	exit 1; \
    fi

RUN LISK_VERSION=$( jq --raw-output .version /home/lisk/lisk/config.json ) && \
    LISK_MIN_VERSION=$( jq --raw-output .minVersion /home/lisk/lisk/config.json ) && \
    sed --in-place --expression \
        "s/__LISK_VERSION__REPLACE_ME__/$LISK_VERSION/;s/__LISK_MIN_VERSION__REPLACE_ME__/$LISK_MIN_VERSION/" \
	/etc/confd/templates/config.json.tmpl

ENV LISK_API_ACCESS_WHITELIST_1=127.0.0.1
ENV LISK_FORGING_ACCESS_WHITELIST_1=${LISK_API_ACCESS_WHITELIST_1}

USER lisk
WORKDIR /home/lisk/lisk
CMD ["/home/lisk/run.sh"]
