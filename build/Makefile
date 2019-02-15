JQ_VERSION := 1.6
POSTGRES_VERSION := 10.7-1
REDIS_VERSION := 4.0.12
REDIS_SHA256SUM := 6447259d2eed426a949c9c13f8fdb2d91fb66d9dc915dd50db13b87f46d93162

LISK_VERSION := $(shell jq --raw-output .version ../package.json)
NODEJS_VERSION := $(shell cat ../.nvmrc)

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Linux)
include linux.mk
else ifeq ($(UNAME_S),Darwin)
include darwin.mk
endif

DATE ?= date
DOWNLOAD ?= wget --no-verbose
LN ?= ln

release/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64.tar.gz.SHA256: release/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64.tar.gz
	cd release/ && sha256sum lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64.tar.gz |tee lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64.tar.gz.SHA256

release/lisk-$(LISK_VERSION)-$(UNAME_S)-x86_64.tar.gz: check ../REVISION ../npm-shrinkwrap.json src/jq src/node-v$(NODEJS_VERSION)-$(NODEJS_ARCH) src/lisk-$(LISK_VERSION).tgz src/redis-$(REDIS_VERSION)/finished src/postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries
	LISK_NETWORK=$(LISK_NETWORK) LISK_VERSION=$(LISK_VERSION) \
	NODE_DIR=node-v$(NODEJS_VERSION)-$(NODEJS_ARCH) \
	POSTGRESQL_FILE=postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries.$(POSTGRES_EXT) \
	LN=$(LN) DATE=$(DATE) \
	  bash ./build.sh

.PHONY: check
check:
ifndef LISK_NETWORK
	$(error The LISK_NETWORK environment variable must be set.)
endif
ifndef LISK_VERSION
	$(error LISK_VERSION could not be read from ../package.json.)
endif
ifndef NODEJS_VERSION
	$(error NODEJS_VERSION could not be read from ../.nvmrc.)
endif

../REVISION:
	git rev-parse HEAD >../REVISION

../npm-shrinkwrap.json:
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

src/redis-$(REDIS_VERSION)/finished: src/redis-$(REDIS_VERSION)
	cd src/redis-$(REDIS_VERSION)/ && make && make check
	touch $@

src/redis-$(REDIS_VERSION): src/redis-$(REDIS_VERSION).tar.gz src/redis-$(REDIS_VERSION).tar.gz.sha256sum
	cd src/ && sha256sum --check redis-$(REDIS_VERSION).tar.gz.sha256sum
	tar xfm src/redis-$(REDIS_VERSION).tar.gz --directory=src

src/redis-$(REDIS_VERSION).tar.gz:
	$(DOWNLOAD) http://download.redis.io/releases/redis-$(REDIS_VERSION).tar.gz --output-document=$@

src/redis-$(REDIS_VERSION).tar.gz.sha256sum:
	echo "$(REDIS_SHA256SUM)  redis-$(REDIS_VERSION).tar.gz" |tee $@

src/postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries: src/postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries.$(POSTGRES_EXT) src/postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries.$(POSTGRES_EXT).sha256sum
	cd src/ && sha256sum --check postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries.$(POSTGRES_EXT).sha256sum
	tar xfm src/postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries.$(POSTGRES_EXT) --directory=src

src/postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries.$(POSTGRES_EXT):
	$(DOWNLOAD) https://get.enterprisedb.com/postgresql/postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries.$(POSTGRES_EXT) --output-document=$@

src/postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries.$(POSTGRES_EXT).sha256sum:
	echo "$(POSTGRES_SHA256SUM)  postgresql-$(POSTGRES_VERSION)-$(POSTGRES_ARCH)-binaries.$(POSTGRES_EXT)" |tee $@

.PHONY: clean
clean:
	rm -rf release/* src/* ../REVISION ../npm-shrinkwrap.json ../lisk-$(LISK_VERSION).tgz
