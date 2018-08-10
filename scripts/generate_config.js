/*
 * LiskHQ/lisk-scripts/updateConfig.js
 * Copyright (C) 2017 Lisk Foundation
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
 *
 * Usage Example:
 * 		node scripts/update_config.js ../lisk-backup/config.json ./config.json
 *
 * 	Reference:
 * 		A user manual can be found on documentation site under /documentation/lisk-core/upgrade/upgrade-configurations
 */

const fs = require('fs');
const path = require('path');
const program = require('commander');
const merge = require('lodash/merge');

const rootPath = path.resolve(path.dirname(__filename), '../');
let networkName;

program
	.version('0.1.1')
	.arguments(
		'<network>',
		'Network name for which to generate the configuration'
	)
	.action(network => {
		networkName = network;
	})
	.parse(process.argv);

if (!networkName) {
	console.error('error: no network name is provided.');
	process.exit(1);
}

function loadFile(fileName) {
	return JSON.parse(fs.readFileSync(path.resolve(rootPath, fileName)));
}

const config = merge(
	{},
	loadFile('config/default/config.json'),
	loadFile(`./config/${networkName}/config.json`)
);

console.info(JSON.stringify(config, null, '\t'));
