FROM node:10-alpine AS builder

ENV NODE_ENV=production

RUN apk --no-cache upgrade && \
    apk --no-cache add alpine-sdk python2 libtool autoconf automake

RUN addgroup -g 1100 lisk && \
    adduser -h /home/lisk -s /bin/bash -u 1100 -G lisk -D lisk
COPY --chown=lisk:lisk . /home/lisk/lisk/

USER lisk
WORKDIR /home/lisk/lisk

RUN npm ci && \
    git rev-parse HEAD >REVISION && \
    rm -rf .git && \
    date --utc "+%Y-%m-%dT%H:%M:%S.000Z" >.build


FROM node:10-alpine

ENV NODE_ENV=production
ENV WFI_COMMIT=e34c502a3efe0e8b8166ea6148d55b73da5c8401
ENV WFI_SHA=0f75de5c9d9c37a933bb9744ffd710750d5773892930cfe40509fa505788835c

RUN apk --no-cache upgrade && \
    apk --no-cache add bash curl jq

RUN addgroup -g 1100 lisk && \
    adduser -h /home/lisk -s /bin/bash -u 1100 -G lisk -D lisk
COPY --from=builder --chown=lisk:lisk /home/lisk/lisk/ /home/lisk/lisk/
RUN mkdir -p /home/lisk/lisk/logs && \
    chown lisk:lisk /home/lisk/lisk/logs

ADD https://raw.githubusercontent.com/vishnubob/wait-for-it/${WFI_COMMIT}/wait-for-it.sh /home/lisk/wait-for-it.sh
RUN if [ x"$( sha256sum /home/lisk/wait-for-it.sh |awk '{print $1}' )" = x"${WFI_SHA}" ]; then \
      chmod 0755 /home/lisk/wait-for-it.sh; \
    else \
      rm -f /home/lisk/wait-for-it.sh; \
      echo "Checksum verification failed."; \
      exit 1; \
    fi

USER lisk
WORKDIR /home/lisk/lisk

ENTRYPOINT ["npm", "start"]
CMD ["-n", "mainnet"]
