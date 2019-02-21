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

BUILD_NAME="lisk-$LISK_VERSION-$( uname -s )-$( uname -m )"

LISK_DIR="$LISK_VERSION"
LISK_FILE="lisk-$LISK_VERSION.tgz"

LISK_SCRIPTS_VERSION="0.7.0"
LISK_SCRIPTS_SHA256SUM="411dbb4216d93616e37f55f8e9cd0c6153083841233dea6cc98f26861edff1fa"
LISK_SCRIPTS_DIR="lisk-scripts-$LISK_SCRIPTS_VERSION"
LISK_SCRIPTS_FILE="$LISK_SCRIPTS_DIR.tar.gz"
LISK_SCRIPTS_URL="https://github.com/LiskHQ/lisk-scripts/archive/v$LISK_SCRIPTS_VERSION.tar.gz"

REDIS_VERSION="4.0.12"
REDIS_SERVER_DIR="redis-$REDIS_VERSION"
REDIS_SERVER_OUT="redis-server"
REDIS_SERVER_CLI="redis-cli"
