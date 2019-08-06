#!/bin/bash

#
# Copyright © 2019 Lisk Foundation
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
#
#

# Unofficial strict mode
set -euo pipefail
IFS=$'\n\t'

# Usage
# npm run clean

rm -rf .nyc_output/
rm -rf browsertest.build/
rm -rf coverage/
rm -rf dist-browser/
rm -rf dist-node/
rm -rf lerna-debug.log
rm -rf npm-debug.log
