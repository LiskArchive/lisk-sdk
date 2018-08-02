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
 * 		node scripts/update_config.js ../lisk-backup/config.json ./config/mainnet/config.json
 *
 * 	Reference:
 * 		A user manual can be found on documentation site under /documentation/lisk-core/upgrade/upgrade-configurations
 */

const extend = require('extend');
const fs = require('fs');
const path = require('path');
const program = require('commander');
const merge = require('lodash/merge');
const observableDiff = require('deep-diff').observableDiff;
const applyChange = require('deep-diff').applyChange;

const rootPath = path.resolve(path.dirname(__filename), '../');
const loadJSONFile = filePath => JSON.parse(fs.readFileSync(filePath), 'utf8');
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

console.info('Starting configuration migration...');
let oldConfig = JSON.parse(fs.readFileSync(oldConfigPath, 'utf8'));
let newConfig = JSON.parse(fs.readFileSync(newConfigPath, 'utf8'));
// If old release was a 1.0.0-rc.1 release
if (oldConfig.version === '1.0.0-rc.1') {
	// Values to keep from new config file
	delete oldConfig.version;
	delete oldConfig.minVersion;

	// https://github.com/LiskHQ/lisk/issues/2154
	oldConfig.api.ssl = extend(true, {}, oldConfig.ssl);
	delete oldConfig.ssl;

	// https://github.com/LiskHQ/lisk/issues/2208
	delete oldConfig.forging.defaultPassword;

	const modifiedConfig = extend(true, {}, newConfig, oldConfig);

	try {
		fs.writeFileSync(newConfigPath, JSON.stringify(modifiedConfig, null, '\t'));
	} catch (error) {
		console.error('Error writing configuration file', error);
		process.exit(1);
	}

	console.info('Configuration migration completed.');

	// No further changes required
	process.exit(0);
}

console.info('Running config migration from 1.0.x to 1.1.x');

// Old config in 1.0.x will be single unified config file.
oldConfig = loadJSONFile(oldConfigPath);

// Had dedicated ssl config only for API
// https://github.com/LiskHQ/lisk/issues/2154
if (oldConfig.ssl) {
	oldConfig.api.ssl = merge({}, oldConfig.ssl);
	delete oldConfig.ssl;
}

// New config in 1.1.x will be partial config other than default/config.json
newConfig = loadJSONFile(newConfigPath);

// Now get a unified config.json for 1.1.x version
const defaultConfig = loadJSONFile(
	path.resolve(rootPath, 'config/default/config.json')
);
const unifiedNewConfig = merge({}, defaultConfig, newConfig);

const changesMap = {
	N: '  Added',
	E: 'Skipped', // Don't apply changes, preserve user configured value
	D: 'Deleted',
	A: 'Skipped', // Updated element of array
};

const arrayItemChangesMap = {
	D: 'Addition', // It was added in new config and deleted from old
};

console.info('\nChanges summary: ');

// Since the structure of both files should be same now
// We just need to extract the value custom values user had modified
observableDiff(oldConfig, unifiedNewConfig, d => {
	switch (d.kind) {
		case 'N':
			console.info(
				`${changesMap[d.kind]}: ${d.path.join('.')} = ${JSON.stringify(d.rhs)}`
			);
			applyChange(oldConfig, unifiedNewConfig, d);
			break;

		case 'E':
			console.info(
				`${changesMap[d.kind]}: ${d.path.join('.')} = ${d.lhs} -> ${d.rhs}`
			);
			// Don't apply changes, preserve user configured value
			// applyChange(oldConfig, unifiedNewConfig, d);
			break;

		case 'D':
			console.info(
				`${changesMap[d.kind]}: ${d.path.join('.')} = ${JSON.stringify(d.lhs)}`
			);
			applyChange(oldConfig, unifiedNewConfig, d);
			break;

		case 'A':
			console.info(
				`${changesMap[d.kind]}: ${d.path.join('.')} = ${
					arrayItemChangesMap[d.item.kind]
				} -> ${d.item.lhs}`
			);
			// Preserve user configured value
			// applyChange(oldConfig, unifiedNewConfig, d);
			break;

		default:
			console.warn(`Unknown change type detected '${d.kind}'`);
	}
});

// Old configuration is up-to-date with new configuration.
// now we need to extract differences from default config file
// to write those in network specific directory
const customConfig = {};
observableDiff(defaultConfig, oldConfig, d => {
	applyChange(customConfig, oldConfig, d);
});

console.info(`\nWriting updated configuration to ${newConfigPath}`);
fs.writeFile(newConfigPath, JSON.stringify(customConfig, null, '\t'), err => {
	if (err) {
		throw err;
	} else {
		console.info('\nConfiguration migration completed.');
	}
});
