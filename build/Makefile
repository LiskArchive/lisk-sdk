lisk_version := $(shell jq --raw-output .version ../package.json)

release/lisk-$(lisk_version)-Linux-x86_64.tar.gz: check ../REVISION
	bash ./build.sh -n $(LISK_NETWORK) -v $(lisk_version) -c

.PHONY: check
check:
ifndef LISK_NETWORK
	$(error The LISK_NETWORK environment variable must be set.)
endif

../REVISION:
	git rev-parse HEAD >../REVISION

.PHONY: clean
clean:
	rm -rf release/* src/* ../REVISION
