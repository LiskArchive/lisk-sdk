/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

const path = require('path');
const fs = require('fs-extra');

const networkPath = path.join(__dirname, './network');
const nodePath = path.join(__dirname, './node');

const networkMigrations = () =>
	fs.readdirSync(networkPath).map(file => path.join(networkPath, file));

const nodeMigrations = () =>
	fs.readdirSync(nodePath).map(file => path.join(nodePath, file));

module.exports = {
	networkMigrations,
	nodeMigrations,
};
