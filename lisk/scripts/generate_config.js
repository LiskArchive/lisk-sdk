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
const program = require('commander');
const merge = require('lodash/merge');

const loadJSONFile = filePath => JSON.parse(fs.readFileSync(filePath), 'utf8');
const loadJSONFileIfExists = filePath => {
	if (fs.existsSync(filePath)) {
		return JSON.parse(fs.readFileSync(filePath), 'utf8');
	}
	return {};
};

program
	.version('0.1.1')
	.option('-c, --config [config]', 'Custom config file')
	.option('-n, --network [network]', 'Specify the network or use LISK_NETWORK')
	.parse(process.argv);

const networkName = program.network || process.env.LISK_NETWORK;

if (!networkName) {
	console.error('error: no network name is provided');
	process.exit(1);
}

const config = merge(
	{},
	loadJSONFile('config/default/config.json'),
	loadJSONFile(`./config/${networkName}/config.json`),
	loadJSONFileIfExists(program.config)
);

console.info(JSON.stringify(config, null, '\t'));
