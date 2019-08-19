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

read -r -p $'\e[96mDo you want to build library first? [y/N]\e[0m ' should_build
if [[ $should_build =~ ^[Yy]$ ]]
then
	npm run build:node
fi
