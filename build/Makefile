lisk_version := $(shell jq --raw-output .version ../package.json)

release/lisk-$(lisk_version)-Linux-x86_64.tar.gz: check src/lisk-$(lisk_version).tgz
	bash ./build.sh -n $(LISK_NETWORK) -v $(lisk_version) -c

.PHONY: check
check:
ifndef LISK_NETWORK
	$(error The LISK_NETWORK environment variable must be set.)
endif

src/lisk-$(lisk_version).tgz: ../REVISION
	cd ..; tar czf build/src/lisk-$(lisk_version).tgz \
	    --exclude-vcs --exclude=build --exclude-ignore=build/build.ignore \
	    --transform='s#^./#package/#' .

../REVISION:
	git rev-parse HEAD >../REVISION

.PHONY: clean
clean:
	rm -rf release/* src/* ../REVISION
