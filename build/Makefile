lisk_version := $(shell jq --raw-output .version ../package.json)
nodejs_version := $(shell cat ../.nvmrc)

release/lisk-$(lisk_version)-Linux-x86_64.tar.gz: check ../REVISION ../npm-shrinkwrap.json src/node-v$(nodejs_version)-linux-x64
	LISK_NETWORK=$(LISK_NETWORK) LISK_VERSION=$(lisk_version) NODE_VERSION=$(nodejs_version) bash ./build.sh

.PHONY: check
check:
ifndef LISK_NETWORK
	$(error The LISK_NETWORK environment variable must be set.)
endif
ifndef lisk_version
	$(error lisk_version could not be read from ../package.json.)
endif
ifndef nodejs_version
	$(error nodejs_version could not be read from ../.nvmrc.)
endif

../REVISION:
	git rev-parse HEAD >../REVISION

../npm-shrinkwrap.json:
	cp ../package-lock.json $@

src/node-v$(nodejs_version)-linux-x64: src/node-v$(nodejs_version)-linux-x64.tar.xz src/node-v$(nodejs_version)-linux-x64.tar.xz.sha256sum
	cd src/ && sha256sum --check node-v$(nodejs_version)-linux-x64.tar.xz.sha256sum
	tar xfm src/node-v$(nodejs_version)-linux-x64.tar.xz --directory=src

src/node-v$(nodejs_version)-linux-x64.tar.xz:
	wget --no-verbose https://nodejs.org/dist/v$(nodejs_version)/node-v$(nodejs_version)-linux-x64.tar.xz --output-document=$@

src/node-v$(nodejs_version)-linux-x64.tar.xz.sha256sum: src/node-v$(nodejs_version)_SHASUMS256.txt src/node-v$(nodejs_version)_SHASUMS256.txt.sig
	gpg --no-default-keyring --keyring ./nodejs-keyring.gpg --verify src/node-v$(nodejs_version)_SHASUMS256.txt.sig src/node-v$(nodejs_version)_SHASUMS256.txt
	grep node-v$(nodejs_version)-linux-x64.tar.xz src/node-v$(nodejs_version)_SHASUMS256.txt |tee $@

src/node-v$(nodejs_version)_SHASUMS256.txt:
	wget --no-verbose https://nodejs.org/dist/v$(nodejs_version)/SHASUMS256.txt --output-document=$@

src/node-v$(nodejs_version)_SHASUMS256.txt.sig:
	wget --no-verbose https://nodejs.org/dist/v$(nodejs_version)/SHASUMS256.txt.sig --output-document=$@

.PHONY: clean
clean:
	rm -rf release/* src/* ../REVISION
