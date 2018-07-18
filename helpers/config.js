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

	const network = program.network || process.env.LISK_NETWORK || 'devnet';

	const genesisBlock = loadJSONFile(`./config/${network}/genesis_block.json`);

	const defaultConstants = require('../config/default/constants.js');
	const customConstants = require(`../config/${network}/constants.js`); // eslint-disable-line import/no-dynamic-require

	const defaultExceptions = require('../config/default/exceptions.js');
	const customExceptions = require(`../config/${network}/exceptions.js`); // eslint-disable-line import/no-dynamic-require

	const defaultConfig = loadJSONFile('config/default/config.json');
	const customConfig = loadJSONFile(
		program.config ||
			process.env.LISK_CONFIG_FILE ||
			`config/${network}/config.json`
	);

	const runtimeConfig = {
		network,
		root: rootPath,
		nonce: randomstring.generate(16),
		version: packageJson.version,
		minVersion: packageJson.lisk.minVersion,
		nethash: genesisBlock.payloadHash,
	};

	let commandLineConfig = {
		wsPort: +program.port || process.env.LISK_WS_PORT || null,
		httpPort: +program.httpPort || process.env.LISK_HTTP_PORT || null,
		address: program.address,
		consoleLogLevel: program.log || process.env.LISK_CONSOLE_LOG_LEVEL,
		db: { database: program.database },
		loading: { snapshotRound: program.snapshot },
		peers: {
			list: extractPeersList(
				program.peers || process.env.LISK_PEERS,
				+program.port ||
					process.env.LISK_WS_PORT ||
					customConfig.wsPort ||
					defaultConfig.wsPort
			),
		},
		coverage: process.env.NODE_ENV === 'test',
	};
	commandLineConfig = cleanDeep(commandLineConfig);

	const appConfig = _.merge(
		defaultConfig,
		customConfig,
		runtimeConfig,
		commandLineConfig
	);

	var validator = new z_schema();
	var valid = validator.validate(appConfig, configSchema.config);

	if (!valid) {
		console.error('Failed to validate config data', validator.getLastErrors());
		process.exit(1);
	} else {
		appConfig.genesisBlock = genesisBlock;

		appConfig.constants = _.merge(defaultConstants, customConstants);

		appConfig.exceptions = _.merge(defaultExceptions, customExceptions);

		validateForce(appConfig);

		return appConfig;
	}
}

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
function validateForce(configData) {
	if (configData.forging.force) {
		var index = configData.constants.nethashes.indexOf(configData.nethash);

		if (index !== -1) {
			console.info('Forced forging disabled for nethash', configData.nethash);
			configData.forging.force = false;
		}
	}
}

// Exports
module.exports = Config;
