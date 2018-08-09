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

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const program = require('commander');
const lisk = require('lisk-elements').default;
const observableDiff = require('deep-diff').observableDiff;
const applyChange = require('deep-diff').applyChange;
const JSONHistory = require('../helpers/json_history');

const rootPath = path.resolve(path.dirname(__filename), '../');
const loadJSONFile = filePath => JSON.parse(fs.readFileSync(filePath), 'utf8');
// Now get a unified config.json for 1.1.x version
const defaultConfig = loadJSONFile(
	path.resolve(rootPath, 'config/default/config.json')
);
let configFilePath;
let fromVersion;
let toVersion;

program
	.version('0.1.1')
	.arguments('<input_file> <from_version> [to_version]')
	.option('--output', 'Output file path')
	.option('--diff', 'Show only difference from default config file.')
	.action((inputFile, version1, version2) => {
		fromVersion = version1;
		toVersion = version2;
		configFilePath = inputFile;
	})
	.parse(process.argv);

const history = new JSONHistory('lisk config file', console);

history.version('0.9.x');
history.version('1.0.0-rc.1', version => {
	version.change('removed version and minVersion', config => {
		delete config.version;
		delete config.minVersion;
		return config;
	});
	version.change('renamed port to httpPort', config => {
		config.httpPort = config.port;
		delete config.port;
		return config;
	});
	version.change('added new config wsPort', config => {
		config.wsPort = config.httpPort + 1;
		return config;
	});
	version.change('updated db.poolSize to min and max', config => {
		config.db.max = config.db.poolSize;
		config.db.min = 10;
		return config;
	});
	version.change('removed peers.options.limits', config => {
		delete config.peers.options.limits;
		return config;
	});
	version.change(
		'renamed transactions.maxTxsPerQueue to transactions.maxTransactionsPerQueue',
		config => {
			config.transactions.maxTransactionsPerQueue =
				config.transactions.maxTxsPerQueue;
			delete config.transactions.maxTxsPerQueue;
			return config;
		}
	);
	version.change('removed loading.verifyOnLoading', config => {
		delete config.loading.verifyOnLoading;
		return config;
	});
	version.change('removed dapp', config => {
		delete config.dapp;
		return config;
	});
	version.change('updated port to wsPort for peers.list', config => {
		config.peers.list = config.peers.list.map(p => {
			p.wsPort = p.port + 1;
			delete p.port;
			return p;
		});
		return config;
	});
	version.change('added db.logFileName for db related logs', config => {
		config.db.logFileName = config.logFileName;
		return config;
	});
	version.change(
		'added api.options.cors to manage CORS settings for http API',
		config => {
			config.api.options.cors = {
				origin: '*',
				methods: ['GET', 'POST', 'PUT'],
			};
			return config;
		}
	);
	version.change(
		'added broadcasts.active=true as boolean value to enable/disable the broadcasting behavior',
		config => {
			config.broadcasts.active = true;
			return config;
		}
	);
	version.change(
		'convert forging.secret to forging.delegates',
		(config, cb) => {
			if (!config.forging.secret || config.forging.secret.length === 0) {
				console.info('No forging secret. So skipping conversion.');
				return setImmediate(cb, null, config);
			}

			askPassword(
				'We found some secrets in your config, if you want to migrate, please enter password with minimum 5 characters (enter to skip): ',
				(err, password) => {
					config.forging.delegates = [];

					if (password.trim().length === 0) {
						delete config.forging.secret;

						return setImmediate(cb, null, config);
					}
					if (password.length < 5) {
						console.error(
							`error: Password is too short (${
								password.length
							} characters), minimum 5 characters.`
						);
						process.exit(1);
					}

					console.info('\nMigrating your secrets...');
					config.forging.secret.forEach(secret => {
						console.info('.......');
						config.forging.delegates.push({
							encryptedPassphrase: lisk.cryptography.stringifyEncryptedPassphrase(
								lisk.cryptography.encryptPassphraseWithPassword(
									secret,
									password
								)
							),
							publicKey: lisk.cryptography.getPrivateAndPublicKeyFromPassphrase(
								secret
							).publicKey,
						});
					});

					delete config.forging.secret;
					return setImmediate(cb, null, config);
				}
			);
		}
	);
});
history.version('1.0.0-rc.2', version => {
	version.change(
		'moved ssl to api.ssl to make SSL as API only config',
		config => {
			config.api.ssl = config.ssl;
			delete config.ssl;
			return config;
		}
	);
});
history.version('1.1.0-alpha.0');
history.version('1.2.0-alpha.0');

const askPassword = (message, cb) => {
	if (program.password && program.password.trim().length !== 0) {
		return setImmediate(cb, null, program.password);
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	rl.question(message, password => {
		rl.close();
		return setImmediate(cb, null, password);
	});
	// To Patch the password support
	rl.stdoutMuted = true;
	rl._writeToOutput = function _writeToOutput(stringToWrite) {
		if (rl.stdoutMuted) rl.output.write('*');
		else rl.output.write(stringToWrite);
	};
};

if (!toVersion) {
	toVersion = require('../package.json').version;
}

// Old config in 1.0.x will be single unified config file.
const configFile = loadJSONFile(configFilePath);

history.migrate(configFile, fromVersion, toVersion, (err, json) => {
	if (err) {
		throw err;
	}
	let customConfig = {};

	if (program.diff) {
		observableDiff(defaultConfig, json, d => {
			applyChange(customConfig, json, d);
		});
	} else {
		customConfig = json;
	}

	if (program.output) {
		console.info(`\nWriting updated configuration to ${program.output}`);
		fs.writeFileSync(program.output, JSON.stringify(customConfig, null, '\t'));
	} else {
		console.info('\n\n------------ OUTPUT -------------');
		console.info(JSON.stringify(customConfig, null, '\t'));
	}
});
