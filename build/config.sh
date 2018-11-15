#!/bin/bash

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

# shellcheck disable=SC2034

VERSION="$VERSION"
OS=$(uname)
ARCH="${ARCH:-$( uname -m )}"
BUILD_NAME="lisk-$VERSION-$OS-$ARCH"
TARGET=""

ncpu=$( grep -c processor /proc/cpuinfo )
ncpu=$(( ncpu + 0 ))
tcpu=$(( ncpu / 2 + 1 ))
[[ $tcpu -gt 8 ]] && tcpu=8
MAKEOPTS="-j${tcpu}"

LISK_DIR="$VERSION"
LISK_FILE="lisk-$VERSION.tgz"
LISK_NETWORK="$LISK_NETWORK"
LISK_URL="https://downloads.lisk.io/lisk/$LISK_NETWORK/$VERSION/$LISK_FILE"

LISK_SCRIPTS_VERSION="0.4.0"
LISK_SCRIPTS_SHA256SUM="03ddb4d651bba12906c77a6f1c3a6931c0e227bcd20cf44d409c0cd59c8d7b12"
LISK_SCRIPTS_DIR="lisk-scripts-$LISK_SCRIPTS_VERSION"
LISK_SCRIPTS_FILE="$LISK_SCRIPTS_DIR.tar.gz"
LISK_SCRIPTS_URL="https://github.com/LiskHQ/lisk-scripts/archive/v$LISK_SCRIPTS_VERSION.tar.gz"

NODE_VERSION="8.12.0"
NODE_SHA256SUM="29a20479cd1e3a03396a4e74a1784ccdd1cf2f96928b56f6ffa4c8dae40c88f2"
NODE_DIR="node-v$NODE_VERSION-linux-x64"
NODE_FILE="$NODE_DIR.tar.xz"
NODE_BIN_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"

POSTGRESQL_VERSION="10.6"
POSTGRESQL_SHA256SUM="95b7573acc6c5554ab06dbf224c1315bd1d008f5d1a12bcb6c9c5edee0c5fddb"
POSTGRESQL_DIR="postgresql-$POSTGRESQL_VERSION-1-linux-x64-binaries"
POSTGRESQL_FILE="$POSTGRESQL_DIR.tar.gz"
POSTGRESQL_BIN_URL="https://get.enterprisedb.com/postgresql/postgresql-${POSTGRESQL_VERSION}-1-linux-x64-binaries.tar.gz"
POSTGRESQL_OUT="pgsql"

REDIS_VERSION="4.0.11"
REDIS_SHA256SUM="fc53e73ae7586bcdacb4b63875d1ff04f68c5474c1ddeda78f00e5ae2eed1bbb"
REDIS_SERVER_DIR="redis-$REDIS_VERSION"
REDIS_SERVER_FILE="$REDIS_SERVER_DIR.tar.gz"
REDIS_SERVER_URL="http://download.redis.io/releases/$REDIS_SERVER_FILE"
REDIS_SERVER_OUT="redis-server"
REDIS_SERVER_CLI="redis-cli"

JQ_VERSION="1.5"
JQ_SHA256SUM="c6b3a7d7d3e7b70c6f51b706a3b90bd01833846c54d32ca32f0027f00226ff6d"
JQ_BIN_URL="https://github.com/stedolan/jq/releases/download/jq-${JQ_VERSION}/jq-linux64"
JQ_FILE="jq"

NPM_CLI="$BUILD_NAME/lib/node_modules/npm/bin/npm-cli.js"

PM2_VERSION=3.1.3
LISK_COMMANDER_VERSION="2.0.0"
