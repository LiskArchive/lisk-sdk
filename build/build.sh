#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

# Copyright © 2018 Lisk Foundation
#
# See the LICENSE file at the top-level directory of this distribution
# for licensing information.
#
# Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
# no part of this software, including this file, may be copied, modified,
# propagated, or distributed except according to the terms contained in the
# LICENSE file.
#
# Removal or modification of this copyright notice is prohibited.

cd "$(cd -P -- "$(dirname -- "$0")" && pwd -P)" || exit 2

if [[ ${LISK_NETWORK:-} && ${LISK_VERSION:-} ]]; then
	echo "Building version ${LISK_VERSION} for ${LISK_NETWORK}."
else
	echo "LISK_NETWORK and LISK_VERSION must be set."
	exit 1
fi

# shellcheck source=./config.sh
. "$(pwd)/config.sh"


pushd src

echo "Cleaning build."
rm -rf "$BUILD_NAME"

echo
echo "Installing lisk-scripts..."
echo "--------------------------------------------------------------------------"
[[ -f "$LISK_SCRIPTS_FILE" ]] || wget -nv "$LISK_SCRIPTS_URL" --output-document="$LISK_SCRIPTS_FILE"
echo "$LISK_SCRIPTS_SHA256SUM  $LISK_SCRIPTS_FILE" |sha256sum -c
if [ ! -f "$LISK_SCRIPTS_DIR/finished" ]; then
	rm -rf "$LISK_SCRIPTS_DIR"
	tar xf "$LISK_SCRIPTS_FILE"
	touch "$LISK_SCRIPTS_DIR/finished"
fi

echo
echo "Building lisk..."
echo "--------------------------------------------------------------------------"
if [ ! -f "$BUILD_NAME/finished" ]; then
	rm -rf "$BUILD_NAME"
	tar xf "$LISK_FILE"
	mv package "$BUILD_NAME"
	mkdir -p "$BUILD_NAME"/{bin,lib,logs}

	# extract postgresql
	tar xf "$POSTGRESQL_FILE" --directory="$BUILD_NAME" \
	    --exclude=doc --exclude=include --exclude="pgAdmin 4" --exclude=stackbuilder

	# copy redis binaries
	cp -f "$REDIS_SERVER_DIR/src/$REDIS_SERVER_OUT" "$BUILD_NAME/bin/$REDIS_SERVER_OUT"
	cp -f "$REDIS_SERVER_DIR/src/$REDIS_SERVER_CLI" "$BUILD_NAME/bin/$REDIS_SERVER_CLI"
	strip "$BUILD_NAME/bin/$REDIS_SERVER_OUT" "$BUILD_NAME/bin/$REDIS_SERVER_CLI"
	# create redis workding directory
	mkdir -p "$BUILD_NAME/redis"

	# copy jq binary
	cp -f jq "$BUILD_NAME/bin/jq"
	strip "$BUILD_NAME/bin/jq"
	chmod +x "$BUILD_NAME/bin/jq"

	# copy lisk "packaged" scripts
	cp -vrf "$LISK_SCRIPTS_DIR/packaged/"* "$BUILD_NAME"

	# extract nodejs
	tar xf "$NODE_DIR.tar.xz" --strip-components=1 --directory="$BUILD_NAME" --exclude=README.md

	pushd "$BUILD_NAME"

	echo "Setting LISK_NETWORK in env.sh..."
	echo "--------------------------------------------------------------------------"
	echo "export LISK_NETWORK=${LISK_NETWORK}" >>env.sh

	echo "Create default custom config.json..."
	echo "--------------------------------------------------------------------------"
	echo '{}' >config.json

	echo "Creating etc/snapshot.json..."
	echo "--------------------------------------------------------------------------"
	cp config.json etc/snapshot.json
	./bin/jq '.httpPort=9000' etc/snapshot.json |sponge etc/snapshot.json
	./bin/jq '.wsPort=9001' etc/snapshot.json |sponge etc/snapshot.json
	./bin/jq '.logFileName="logs/lisk_snapshot.log"' etc/snapshot.json |sponge etc/snapshot.json
	./bin/jq '.fileLogLevel="info"' etc/snapshot.json |sponge etc/snapshot.json
	./bin/jq '.db.database="lisk_snapshot"' etc/snapshot.json |sponge etc/snapshot.json
	./bin/jq '.peers.list=[]' etc/snapshot.json |sponge etc/snapshot.json
	./bin/jq '.loading.loadPerIteration=101' etc/snapshot.json |sponge etc/snapshot.json

	echo "Installing lisk..."
	echo "--------------------------------------------------------------------------"
	set +u
	# shellcheck disable=SC1090
	. "$(pwd)/env.sh"
	set -u
	npm ci --production
	"$LN" --symbolic ../node_modules/lisk-commander/bin/run bin/lisk
	"$LN" --symbolic ../node_modules/pm2/bin/pm2 bin/pm2

	"$DATE" --utc "+%Y-%m-%dT%H:%M:%S.000Z" >.build
	"$DATE" >finished
	popd
fi

echo
echo "Creating tarball..."
echo "--------------------------------------------------------------------------"
rm -rf ../release/*
tar czf "../release/$BUILD_NAME.tar.gz" "$BUILD_NAME"
popd
