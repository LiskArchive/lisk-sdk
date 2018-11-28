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

CLEAN=false
OPTIND=1
while getopts "cn:v:" OPT; do
	case "$OPT" in
		c) CLEAN=true;;
		n) LISK_NETWORK="$OPTARG";;
		v) VERSION="$OPTARG";;
		:) echo 'Missing option argument for -'"$OPTARG" >&2; exit 1;;
		*) echo 'Unimplemented option: -'"$OPTARG" >&2; exit 1;;
	esac
done

if [[ ${VERSION:-} && ${LISK_NETWORK:-} ]]; then
	echo "Building version $VERSION for ${LISK_NETWORK}."
else
	echo "Both -n and -v are required. Exiting."
	exit 1
fi

# shellcheck source=./config.sh
. "$(pwd)/config.sh"

if [[ "$CLEAN" == true ]]; then
	echo "Cleaning build."
	rm -rf "src/$BUILD_NAME"
fi

pushd src

echo
echo "Downloading Node.JS..."
echo "--------------------------------------------------------------------------"
[[ -f "$NODE_FILE" ]] || wget -nv "$NODE_BIN_URL" --output-document="$NODE_FILE"
echo "$NODE_SHA256SUM  $NODE_FILE" |sha256sum -c

echo "Extracting Node.JS for our own use"
echo "--------------------------------------------------------------------------"
rm -rf "$NODE_DIR"
tar xf "$NODE_FILE"

echo "Running 'npm pack'"
echo "--------------------------------------------------------------------------"
(
	PATH="$PWD/$NODE_DIR/bin:$PATH"
	cd ../..
	npm pack
	mv "$LISK_FILE" build/src/
)

echo
echo "Downloading jq..."
echo "--------------------------------------------------------------------------"
[[ -f "$JQ_FILE" ]] || wget -nv "$JQ_BIN_URL" --output-document="$JQ_FILE"
echo "$JQ_SHA256SUM  $JQ_FILE" |sha256sum -c

echo
echo "Downloading and building redis..."
echo "--------------------------------------------------------------------------"
[[ -f "$REDIS_SERVER_FILE" ]] || wget -nv "$REDIS_SERVER_URL" --output-document="$REDIS_SERVER_FILE"
echo "$REDIS_SHA256SUM  $REDIS_SERVER_FILE" |sha256sum -c
if [ ! -f "$REDIS_SERVER_DIR/finished" ]; then
	rm -rf $REDIS_SERVER_DIR
	tar xf $REDIS_SERVER_FILE
	pushd "$REDIS_SERVER_DIR"
	make
	make check
	touch finished
	popd
fi

echo
echo "Downloading postgresql..."
echo "--------------------------------------------------------------------------"
[[ -f "$POSTGRESQL_FILE" ]] || wget -nv "$POSTGRESQL_BIN_URL" --output-document="$POSTGRESQL_FILE"
echo "$POSTGRESQL_SHA256SUM  $POSTGRESQL_FILE" |sha256sum -c

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
	cp -f "$JQ_FILE" "$BUILD_NAME/bin/$JQ_FILE"
	strip "$BUILD_NAME/bin/$JQ_FILE"
	chmod +x "$BUILD_NAME/bin/$JQ_FILE"

	# copy lisk "packaged" scripts
	cp -vrf "$LISK_SCRIPTS_DIR/packaged/"* "$BUILD_NAME"

	# extract nodejs
	tar xf "$NODE_FILE" --strip-components=1 --directory="$BUILD_NAME"

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
	"./bin/$JQ_FILE" '.httpPort=9000' etc/snapshot.json |sponge etc/snapshot.json
	"./bin/$JQ_FILE" '.wsPort=9001' etc/snapshot.json |sponge etc/snapshot.json
	"./bin/$JQ_FILE" '.logFileName="logs/lisk_snapshot.log"' etc/snapshot.json |sponge etc/snapshot.json
	"./bin/$JQ_FILE" '.fileLogLevel="info"' etc/snapshot.json |sponge etc/snapshot.json
	"./bin/$JQ_FILE" '.db.database="lisk_snapshot"' etc/snapshot.json |sponge etc/snapshot.json
	"./bin/$JQ_FILE" '.peers.list=[]' etc/snapshot.json |sponge etc/snapshot.json
	"./bin/$JQ_FILE" '.loading.loadPerIteration=101' etc/snapshot.json |sponge etc/snapshot.json

	echo "Installing lisk..."
	echo "--------------------------------------------------------------------------"
	set +u
	# shellcheck disable=SC1090
	. "$(pwd)/env.sh"
	set -u
	npm install --production

	echo "Installing pm2 and lisk-commander..."
	echo "--------------------------------------------------------------------------"
	npm install --production --global "pm2@$PM2_VERSION"
	npm install --production --global "lisk-commander@$LISK_COMMANDER_VERSION"

	date --utc "+%Y-%m-%dT%H:%M:%S.000Z" >.build
	date >finished
	popd
fi

echo
echo "Creating tarball..."
echo "--------------------------------------------------------------------------"
rm -rf ../release/*
tar czf "../release/$BUILD_NAME.tar.gz" "$BUILD_NAME"

echo
echo "Creating checksums of tarball..."
echo "--------------------------------------------------------------------------"
pushd ../release
sha256sum "$BUILD_NAME.tar.gz" >"$BUILD_NAME.tar.gz.SHA256"
popd
popd
