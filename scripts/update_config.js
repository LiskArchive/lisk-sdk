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
const readline = require('readline');
const program = require('commander');
const extend = require('extend');
const lisk = require('lisk-elements');

let oldConfigPath;
let newConfigPath;

program
	.version('0.1.1')
	.arguments('<old_config_file> <new_config_file>')
	.action((oldConfig, newConfig) => {
		oldConfigPath = oldConfig;
		newConfigPath = newConfig;
	})
	.option(
		'-p, --password <string>',
		"Password for secret encryption. This feature is only for testing purpose, don't use is it production.",
		''
	)
	.parse(process.argv);

if (!oldConfigPath || !newConfigPath) {
	console.error('error: no config file provided.');
	process.exit(1);
}

console.info('No config migration for Devnet...');
const oldConfig = JSON.parse(fs.readFileSync(oldConfigPath, 'utf8'));
const newConfig = JSON.parse(fs.readFileSync(newConfigPath, 'utf8'));

copyTheConfigFile();
// No further changes required
process.exit(0);


function copyTheConfigFile() {
	// Values to keep from new config file
	delete oldConfig.version;
	delete oldConfig.minVersion;

	const modifiedConfig = extend(true, {}, newConfig, oldConfig);

	try {
		fs.writeFileSync(newConfigPath, JSON.stringify(modifiedConfig, null, '\t'));
	} catch (error) {
		console.error('Error writing configuration file', error);
		process.exit(1);
	}

	console.info('Configuration migration completed.');
}
