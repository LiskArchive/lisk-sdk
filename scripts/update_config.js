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
const _ = require('lodash');
const program = require('commander');
const {
	stringifyEncryptedPassphrase,
	getPrivateAndPublicKeyFromPassphrase,
	encryptPassphraseWithPassword,
} = require('@liskhq/lisk-cryptography');
const tempy = require('tempy');
const { observableDiff, applyChange } = require('deep-diff');
const JSONHistory = require('./json_history');
const AppConfig = require('../helpers/config');
const packageJSON = require('../../../../../package.json');

const rootPath = path.resolve(path.dirname(__filename), '../');
const loadJSONFile = filePath => JSON.parse(fs.readFileSync(filePath), 'utf8');
const loadJSONFileIfExists = filePath => {
	if (fs.existsSync(filePath)) {
		return JSON.parse(fs.readFileSync(filePath), 'utf8');
	}
	return {};
};

let configFilePath;
let fromVersion;
let toVersion;

program
	.version('0.1.1')
	.arguments('<input_file> <from_version> [to_version]')
	.option('-n, --network [network]', 'Specify the network or use LISK_NETWORK')
	.option('-o, --output [output]', 'Output file path')
	.action((inputFile, version1, version2) => {
		fromVersion = version1;
		toVersion = version2;
		configFilePath = inputFile;
	})
	.parse(process.argv);

if (typeof configFilePath === 'undefined') {
	console.error('No input file is provided.');
	process.exit(1);
}

if (typeof fromVersion === 'undefined') {
	console.error('No start version is provided');
	process.exit(1);
}

const network = program.network || process.env.LISK_NETWORK;

if (typeof network === 'undefined') {
	console.error('No network is provided');
	process.exit(1);
}

const defaultConfig = loadJSONFile(
	path.resolve(rootPath, 'config/default/config.json')
);

const networkConfig = loadJSONFileIfExists(
	path.resolve(rootPath, `config/${network}/config.json`)
);

const unifiedNewConfig = _.merge({}, defaultConfig, networkConfig);

const userConfig = loadJSONFileIfExists(configFilePath);

const history = new JSONHistory('lisk config file', console);

history.version('0.9.x');
history.version('1.0.0-rc.1', version => {
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

			return askPassword(
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
							encryptedPassphrase: stringifyEncryptedPassphrase(
								encryptPassphraseWithPassword(secret, password)
							),
							publicKey: getPrivateAndPublicKeyFromPassphrase(secret).publicKey,
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
history.version('1.1.0-rc.0', version => {
	version.change('removed version and minVersion', config => {
		delete config.version;
		delete config.minVersion;
		return config;
	});
	version.change('removed nethash', config => {
		delete config.nethash;
		return config;
	});
});
history.version('1.2.0-rc.x', version => {
	version.change('remove malformed peer list items', config => {
		config.peers.list = config.peers.list.filter(
			peer => peer.ip && peer.wsPort
		);
		return config;
	});
});

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

	return true;
};

if (!toVersion) {
	toVersion = packageJSON.version;
}

history.migrate(
	_.merge({}, unifiedNewConfig, userConfig),
	fromVersion,
	toVersion,
	(err, json) => {
		if (err) {
			throw err;
		}
		const customConfig = {};

		observableDiff(unifiedNewConfig, json, d => {
			// if there is any change on one attribute of object in array
			// we want to preserve the full object not just that single attribute
			// it is required due to nature of configuration merging in helpers/config.js
			// e.g. If someone changed ip of a peer we want to keep full peer object in array
			//
			// if change is type of edit value
			// and change path is pointing to a deep object
			// and path second last index is an integer (means its an array element)
			const changeInDeepObject =
				d.kind === 'E' &&
				d.path.length > 2 &&
				Number.isInteger(d.path[d.path.length - 2]);

			// if there is a change in array element we want to preserve it as well to original value
			const changeInArrayElement = d.kind === 'A';

			const clonedPath = _.clone(d.path);

			if (changeInArrayElement) {
				_.set(
					customConfig,
					clonedPath,
					_.get(unifiedNewConfig, clonedPath, {})
				);
			} else if (changeInDeepObject) {
				// Remove last item in path to get index of object in array
				clonedPath.splice(-1, 1);
				_.set(
					customConfig,
					clonedPath,
					_.get(unifiedNewConfig, clonedPath, {})
				);
			}
			applyChange(customConfig, json, d);
		});

		const tempFilePath = tempy.file();

		console.info('\nWriting configuration file temporarily for validation.');
		console.info(tempFilePath);
		fs.writeFileSync(tempFilePath, JSON.stringify(customConfig, null, '\t'));

		console.info('\nValidating the configuration file');
		// Set the env variables to validate against correct network and config file
		process.env.LISK_NETWORK = network;
		process.env.LISK_CONFIG_FILE = tempFilePath;
		new AppConfig(packageJSON, false);
		console.info('Validation finished successfully.');

		if (program.output) {
			console.info(`\nWriting configuration file to ${program.output}`);
			fs.writeFileSync(
				program.output,
				JSON.stringify(customConfig, null, '\t')
			);
		} else {
			console.info('\n\n------------ OUTPUT -------------');
			console.info(JSON.stringify(customConfig, null, '\t'));
		}
	}
);
