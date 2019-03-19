JQ_VERSION := 1.6
POSTGRES_VERSION := 10.7-1
REDIS_VERSION := 4.0.13
REDIS_SHA256SUM := 17d955227966dcd68590be6139e5fe7f2d19fc4fb7334248a904ea9cdd30c1d4

DATE_FORMAT := "+%Y-%m-%dT%H:%M:%S.000Z"

LISK_VERSION := $(shell jq --raw-output .version ../package.json)
NODEJS_VERSION := $(shell cat ../.nvmrc)

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Linux)
include linux.mk
else ifeq ($(UNAME_S),Darwin)
include darwin.mk
endif
# defaults
DATE ?= date
DOWNLOAD ?= wget --no-verbose
GNUPG ?= gpg2
INSTALL ?= install
LN ?= ln

.PHONY: all
all: check release/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64.tar.gz.SHA256

.PHONY: check
check:
ifndef LISK_NETWORK
	$(error The LISK_NETWORK environment variable must be set.)
endif
ifeq "$(LISK_VERSION)" "null"
	$(error LISK_VERSION could not be read from ../package.json.)
endif
ifndef NODEJS_VERSION
	$(error NODEJS_VERSION could not be read from ../.nvmrc.)
endif

release/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64.tar.gz.SHA256: release/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64.tar.gz
	cd release/ && sha256sum lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64.tar.gz |tee lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64.tar.gz.SHA256

release/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64.tar.gz: src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64
	cd src/ && GZIP=-9 tar czf ../$@ lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64

src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64: src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/finished
	rm -rf src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_temp
	cp -rf src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_temp
	rm -f src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_temp/finished
	mv src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_temp $@

src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/finished: \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/.build \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/REVISION \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/config.json \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/env.sh \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/lisk.sh \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/lisk_snapshot.sh \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/shared.sh \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/tune.sh \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/bin/jq \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/bin/lisk \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/bin/node \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/bin/pm2 \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/bin/redis-cli \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/bin/redis-server \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/etc/pm2-lisk.json \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/etc/pm2-snapshot.json \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/etc/redis.conf \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/etc/snapshot.json \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/var/db/blockchain.db.gz \
		| \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/logs \
		src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/redis
	touch $@

src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image: ../lisk-$(LISK_VERSION).tgz src/postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries.$(POSTGRES_EXT) src/postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries.$(POSTGRES_EXT).sha256sum
	rm -rf src/package
	tar xfm ../lisk-$(LISK_VERSION).tgz --directory=src
	cd src/ && sha256sum --check postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries.$(POSTGRES_EXT).sha256sum
	tar xfm src/postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries.$(POSTGRES_EXT) \
	  --exclude=doc --exclude=include --exclude="pgAdmin 4*" --exclude=stackbuilder \
	  --directory=src/package
	mv src/package $@

src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/bin: | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image
	mkdir $@
src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/etc: | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image
	mkdir $@
src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/lib: | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image
	mkdir $@
src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/logs: | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image
	mkdir $@
src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/redis: | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image
	mkdir $@
src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/var: | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image
	mkdir $@
src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/var/db: | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/var
	mkdir $@

src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/.build: | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image
	$(DATE) --utc $(DATE_FORMAT) >$@

src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/REVISION: ../.git/HEAD | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image
	git rev-parse HEAD >$@

src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/config.json: | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image
	echo '{}' >$@

src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/env.sh: | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image
	( cat target/env.sh; echo "export LISK_NETWORK=$(LISK_NETWORK)" ) |tee $@
src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/shared.sh: | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image
	$(INSTALL) --mode=0644 target/$(@F) $@
src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/%.sh: | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image
	$(INSTALL) --mode=0755 target/$(@F) $@
src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/etc/%: | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/etc
	$(INSTALL) --mode=0644 target/etc/$(@F) $@

src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/node_modules: | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image
	cd $(@D)/ && PATH="${PWD}/src/node-v$(NODEJS_VERSION)-$(NODEJS_ARCH)/bin:${PATH}" npm ci --production

src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/bin/jq: src/jq | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/bin
	$(INSTALL) --mode=0755 --strip src/jq --target-directory=$(@D)

src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/bin/lisk: | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/node_modules src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/bin
	$(LN) --symbolic ../node_modules/lisk-commander/bin/run $@

src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/bin/node: src/node-v$(NODEJS_VERSION)-$(NODEJS_ARCH).tar.xz | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image
	tar xfm src/node-v$(NODEJS_VERSION)-$(NODEJS_ARCH).tar.xz --strip-components=1 --directory=src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image --exclude=README.md

src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/bin/pm2: | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/node_modules src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/bin
	$(LN) --symbolic ../node_modules/pm2/bin/pm2 $@

src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/bin/redis-%: src/redis-$(REDIS_VERSION)/src/redis-% | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/bin
	$(INSTALL) --mode=0755 --strip src/redis-$(REDIS_VERSION)/src/$(@F) --target-directory=$(@D)

src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/var/db/blockchain.db.gz: | src/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64_image/var/db
	touch $@

../npm-shrinkwrap.json: ../package-lock.json
	cp ../package-lock.json $@

src/jq: src/jq-$(JQ_ARCH) src/jq-$(JQ_ARCH).sha256sum
	sha256sum -c src/jq-$(JQ_ARCH).sha256sum
	cp -f src/jq-$(JQ_ARCH) $@

src/jq-$(JQ_ARCH):
	$(DOWNLOAD) https://github.com/stedolan/jq/releases/download/jq-$(JQ_VERSION)/jq-$(JQ_ARCH) --output-document=$@

src/jq-$(JQ_ARCH).sha256sum:
	echo "$(JQ_SHA256SUM)  src/jq-$(JQ_ARCH)" |tee $@

src/node-v$(NODEJS_VERSION)-$(NODEJS_ARCH): src/node-v$(NODEJS_VERSION)-$(NODEJS_ARCH).tar.xz src/node-v$(NODEJS_VERSION)-$(NODEJS_ARCH).tar.xz.sha256sum
	cd src/ && sha256sum --check node-v$(NODEJS_VERSION)-$(NODEJS_ARCH).tar.xz.sha256sum
	tar xfm src/node-v$(NODEJS_VERSION)-$(NODEJS_ARCH).tar.xz --directory=src

src/node-v$(NODEJS_VERSION)-$(NODEJS_ARCH).tar.xz:
	$(DOWNLOAD) https://nodejs.org/dist/v$(NODEJS_VERSION)/node-v$(NODEJS_VERSION)-$(NODEJS_ARCH).tar.xz --output-document=$@

src/node-v$(NODEJS_VERSION)-$(NODEJS_ARCH).tar.xz.sha256sum: src/node-v$(NODEJS_VERSION)_SHASUMS256.txt src/node-v$(NODEJS_VERSION)_SHASUMS256.txt.sig
	$(GNUPG) --no-default-keyring --keyring ./nodejs-keyring.gpg --verify src/node-v$(NODEJS_VERSION)_SHASUMS256.txt.sig src/node-v$(NODEJS_VERSION)_SHASUMS256.txt
	grep node-v$(NODEJS_VERSION)-$(NODEJS_ARCH).tar.xz src/node-v$(NODEJS_VERSION)_SHASUMS256.txt |tee $@

src/node-v$(NODEJS_VERSION)_SHASUMS256.txt:
	$(DOWNLOAD) https://nodejs.org/dist/v$(NODEJS_VERSION)/SHASUMS256.txt --output-document=$@

src/node-v$(NODEJS_VERSION)_SHASUMS256.txt.sig:
	$(DOWNLOAD) https://nodejs.org/dist/v$(NODEJS_VERSION)/SHASUMS256.txt.sig --output-document=$@

../lisk-$(LISK_VERSION).tgz: ../npm-shrinkwrap.json src/node-v$(NODEJS_VERSION)-$(NODEJS_ARCH)
	cd ../ && PATH="${PWD}/src/node-v$(NODEJS_VERSION)-$(NODEJS_ARCH)/bin:${PATH}" npm pack

src/lisk-$(LISK_VERSION).tgz: ../lisk-$(LISK_VERSION).tgz
	cp -f ../lisk-$(LISK_VERSION).tgz $@

src/redis-$(REDIS_VERSION)/src/redis-%: src/redis-$(REDIS_VERSION)
	cd src/redis-$(REDIS_VERSION)/ && make && make check
	touch $@

src/redis-$(REDIS_VERSION): src/redis-$(REDIS_VERSION).tar.gz src/redis-$(REDIS_VERSION).tar.gz.sha256sum
	cd src/ && sha256sum --check redis-$(REDIS_VERSION).tar.gz.sha256sum
	tar xfm src/redis-$(REDIS_VERSION).tar.gz --directory=src

src/redis-$(REDIS_VERSION).tar.gz:
	$(DOWNLOAD) http://download.redis.io/releases/redis-$(REDIS_VERSION).tar.gz --output-document=$@

src/redis-$(REDIS_VERSION).tar.gz.sha256sum:
	echo "$(REDIS_SHA256SUM)  redis-$(REDIS_VERSION).tar.gz" |tee $@

src/postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries.$(POSTGRES_EXT):
	$(DOWNLOAD) https://get.enterprisedb.com/postgresql/postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries.$(POSTGRES_EXT) --output-document=$@

src/postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries.$(POSTGRES_EXT).sha256sum:
	echo "$(POSTGRES_SHA256SUM)  postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries.$(POSTGRES_EXT)" |tee $@

.PHONY: clean
clean:
	rm -rf release/* src/lisk-$(LISK_VERSION)*

.PHONY: mrproper
mrproper: clean
	rm -rf src/* ../npm-shrinkwrap.json ../lisk-$(LISK_VERSION).tgz
