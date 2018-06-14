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


// Migration of config.json from version 1.0.0-beta.7 to 1.0.0-beta.8
// Doesn't migrate secrets.

const fs = require('fs');
const program = require('commander');
const extend = require('extend');

let oldConfigPath;
let newConfigPath;

program
	.version('0.1.1')
	.arguments('<old_config_file> <new_config_file>')
	.action((oldConfig, newConfig) => {
		oldConfigPath = oldConfig;
		newConfigPath = newConfig;
	})
	.parse(process.argv);

if (!oldConfigPath || !newConfigPath) {
	console.error('error: no config file provided.');
	process.exit(1);
}

console.info('Starting configuration migration. Without secrets! Please encrypt them manually using lisk-commander');
const oldConfig = JSON.parse(fs.readFileSync(oldConfigPath, 'utf8'));
const newConfig = JSON.parse(fs.readFileSync(newConfigPath, 'utf8'));

// Values to keep from new config file
delete oldConfig.version;
delete oldConfig.minVersion;

// loading.verifyOnLoading had been removed
delete oldConfig.loading.verifyOnLoading;

oldConfig.forging.delegates = [];

oldConfig.forging.defaultPassword = oldConfig.forging.defautKey;
delete oldConfig.forging.defautKey;
delete oldConfig.forging.secret;

const modifiedConfig = extend(true, {}, newConfig, oldConfig);

fs.writeFile(
	newConfigPath,
	JSON.stringify(modifiedConfig, null, '\t'),
	err => {
		if (err) {
			throw err;
		} else {
			console.info('Configuration migration completed.');
		}
	}
);
