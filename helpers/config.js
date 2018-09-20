/*
 * Copyright © 2018 Lisk Foundation
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

const fs = require('fs');
const path = require('path');
const program = require('commander');
const _ = require('lodash');
const randomstring = require('randomstring');
const configSchema = require('../schema/config.js');
const z_schema = require('./z_schema.js');
const deepFreeze = require('./deep_freeze_object.js');

const rootPath = path.dirname(path.resolve(__filename, '..'));

/**
 * Description of the module.
 *
 * @module
 * @see Parent: {@link helpers}
 */

/**
 * Loads config.json file.
 *
 * @param {Object} packageJson
 * @param {Boolean} parseCommandLineOptions - Should parse the command line options or not
 * @returns {Object}
 * @todo Add description for the params and the return value
 */
function Config(packageJson, parseCommandLineOptions = true) {
	program
		.version(packageJson.version)
		.option('-c, --config <path>', 'config file path')
		.option(
			'-n, --network [network]',
			'lisk network [devnet|betanet|mainnet|testnet]. Defaults to "devnet"'
		)
		.option('-p, --port <port>', 'listening port number')
		.option('-h, --http-port <httpPort>', 'listening HTTP port number')
		.option('-d, --database <database>', 'database name')
		.option('-a, --address <ip>', 'listening host name or ip')
		.option('-x, --peers [peers...]', 'peers list')
		.option('-l, --log <level>', 'log level')
		.option('-s, --snapshot <round>', 'verify snapshot')
		.option('--inspect-workers', 'inspect worker processes')
		.option('--inspect-brokers', 'inspect broker processes');

	if (parseCommandLineOptions) {
		program.parse(process.argv);
	}

	const network = program.network || getenv(process.env.LISK_NETWORK, 'devnet');
	// Define lisk network env variable to be used by child processes load config files
	process.env.LISK_NETWORK = network;

	const genesisBlock = loadJSONFile(`./config/${network}/genesis_block.json`);

	const defaultConstants = require('../config/default/constants.js');
	const networkConstants = require(`../config/${network}/constants.js`); // eslint-disable-line import/no-dynamic-require

	const defaultExceptions = require('../config/default/exceptions.js');
	const networkExceptions = require(`../config/${network}/exceptions.js`); // eslint-disable-line import/no-dynamic-require

	const defaultConfig = loadJSONFile('config/default/config.json');
	const networkConfig = loadJSONFile(`config/${network}/config.json`);

	let customConfig = {};
	if (program.config || process.env.LISK_CONFIG_FILE) {
		customConfig = loadJSONFile(program.config || process.env.LISK_CONFIG_FILE);
	}

	const runtimeConfig = {
		network,
		root: rootPath,
		nonce: randomstring.generate(16),
		version: packageJson.version,
		minVersion: packageJson.lisk.minVersion,
		nethash: genesisBlock.payloadHash,
	};

	let commandLineConfig = {
		wsPort: +program.port || parseInt(getenv(process.env.LISK_WS_PORT)) || null,
		httpPort:
			+program.httpPort || parseInt(getenv(process.env.LISK_HTTP_PORT)) || null,
		address: program.address || getenv(process.env.LISK_ADDRESS),
		fileLogLevel: program.log || getenv(process.env.LISK_FILE_LOG_LEVEL),
		consoleLogLevel: getenv(process.env.LISK_CONSOLE_LOG_LEVEL),
		cacheEnabled: getenv(process.env.LISK_CACHE_ENABLED, null, true),
		db: {
			database: program.database || getenv(process.env.LISK_DB_NAME),
			host: getenv(process.env.LISK_DB_HOST),
			port: parseInt(getenv(process.env.LISK_DB_PORT)) || null,
			user: getenv(process.env.LISK_DB_USER),
			password: getenv(process.env.LISK_DB_PASSWORD),
		},
		api: {
			access: {
				public: getenv(process.env.LISK_API_PUBLIC, null, true),
				whiteList: extractWhiteListIPs(process.env.LISK_API_WHITELIST),
			},
		},
		forging: {
			delegates: extractDelegatesList(process.env.LISK_FORGING_DELEGATES),
			access: {
				whiteList: extractWhiteListIPs(process.env.LISK_FORGING_WHITELIST),
			},
		},
		loading: { snapshotRound: program.snapshot },
		peers: {
			list: extractPeersList(
				program.peers || getenv(process.env.LISK_PEERS),
				+program.port ||
					parseInt(getenv(process.env.LISK_WS_PORT)) ||
					customConfig.wsPort ||
					networkConfig.wsPort ||
					defaultConfig.wsPort
			),
		},
		coverage: getenv(process.env.NODE_ENV) === 'test',
	};
	commandLineConfig = cleanDeep(commandLineConfig);

	const appConfig = _.mergeWith(
		{},
		defaultConfig,
		networkConfig,
		customConfig,
		commandLineConfig,
		runtimeConfig,
		(objValue, srcValue) => {
			if (_.isArray(objValue)) {
				return srcValue;
			}
		}
	);

	var validator = new z_schema();
	var valid = validator.validate(appConfig, configSchema.config);

	if (!valid) {
		console.error('Failed to validate config data', validator.getLastErrors());
		process.exit(1);
	} else {
		appConfig.genesisBlock = genesisBlock;

		appConfig.constants = deepFreeze(
			_.merge(defaultConstants, networkConstants)
		);

		appConfig.exceptions = _.merge(defaultExceptions, networkExceptions);

		validateForce(appConfig);

		return appConfig;
	}
}

const getenv = (variable, defaultValue = null, isBoolean = false) => {
	if (isBoolean) {
		return variable ? variable === 'true' : defaultValue;
	}

	return variable || defaultValue;
};

function loadJSONFile(filePath) {
	try {
		filePath = path.resolve(rootPath, filePath);
		return JSON.parse(fs.readFileSync(filePath, 'utf8'));
	} catch (err) {
		console.error(`Failed to load file: ${filePath}`);
		console.error(err.message);
		process.exit(1);
	}
}

function extractPeersList(peers, defaultPort) {
	if (typeof peers === 'string') {
		return peers.split(',').map(peer => {
			peer = peer.split(':');
			return {
				ip: peer.shift(),
				wsPort: peer.shift() || defaultPort,
			};
		});
	}
	return [];
}

function extractWhiteListIPs(ips) {
	if (typeof ips === 'string') {
		return ips.split(',');
	}
	return [];
}

function extractDelegatesList(delegates) {
	if (typeof delegates === 'string') {
		return delegates.split(',').map(delegate => {
			delegate = delegate.split('|');
			return {
				publicKey: delegate[0],
				encryptedPassphrase: delegate[1],
			};
		});
	}
	return [];
}

function cleanDeep(
	object,
	{
		emptyArrays = true,
		emptyObjects = true,
		emptyStrings = true,
		nullValues = true,
		undefinedValues = true,
	} = {}
) {
	return _.transform(object, (result, value, key) => {
		// Recurse into arrays and objects.
		if (Array.isArray(value) || _.isPlainObject(value)) {
			value = cleanDeep(value, {
				emptyArrays,
				emptyObjects,
				emptyStrings,
				nullValues,
				undefinedValues,
			});
		}

		// Exclude empty objects.
		if (emptyObjects && _.isPlainObject(value) && _.isEmpty(value)) {
			return;
		}

		// Exclude empty arrays.
		if (emptyArrays && Array.isArray(value) && !value.length) {
			return;
		}

		// Exclude empty strings.
		if (emptyStrings && value === '') {
			return;
		}

		// Exclude null values.
		if (nullValues && value === null) {
			return;
		}

		// Exclude undefined values.
		if (undefinedValues && value === undefined) {
			return;
		}

		// Append when recursing arrays.
		if (Array.isArray(result)) {
			return result.push(value);
		}

		result[key] = value;
	});
}

/**
 * Validates nethash value from constants and sets forging force to false if any.
 *
 * @private
 * @param {Object} configData
 * @todo Add description for the params
 */
function validateForce({ constants, forging, nethash }) {
	if (forging.force) {
		const { NETHASHES } = constants;

		if (NETHASHES.indexOf(nethash) !== -1) {
			console.info('Forced forging disabled for nethash', nethash);
			forging.force = false;
		}
	}
}

// Exports
module.exports = Config;
