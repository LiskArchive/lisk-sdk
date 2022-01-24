#!/bin/bash

#
# Copyright © 2020 Lisk Foundation
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

CYPRESS_VERSION=5.6.0
CACHE_PATH=`npx cypress cache path`

SOURCE=`dirname ${BASH_SOURCE[0]}`

if [[ "$OSTYPE" == "darwin"* ]]; then
  PACKAGES_PATH="$CACHE_PATH/$CYPRESS_VERSION/Cypress.app/Contents/Resources/app/packages"
else
  PACKAGES_PATH="$CACHE_PATH/$CYPRESS_VERSION/Cypress/resources/app/packages"
fi

BUFFER_PACKAGE_PATH="$PACKAGES_PATH/server/node_modules/node-libs-browser/node_modules/buffer"
LOCAL_BUFFER_PATH=`realpath $SOURCE/../../../../node_modules/buffer`

if [ -d "$BUFFER_PACKAGE_PATH" ]; then rm -r $BUFFER_PACKAGE_PATH; fi
cp -r $LOCAL_BUFFER_PATH $BUFFER_PACKAGE_PATH
