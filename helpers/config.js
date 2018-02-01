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

var fs = require('fs');
var path = require('path');
var program = require('commander');
var z_schema = require('./z_schema.js');
var configSchema = require('../schema/config.js');
var constants = require('../helpers/constants.js');

/**
 * Loads config.json file
 * @memberof module:helpers
 * @implements {validateForce}
 * @param {Object} packageJson
 * @returns {Object} configData
 */
function Config(packageJson) {
	program
		.version(packageJson.version)
		.option('-c, --config <path>', 'config file path')
		.option('-p, --port <port>', 'listening port number')
		.option('-h, --http-port <httpPort>', 'listening HTTP port number')
		.option('-d, --database <database>', 'database name')
		.option('-a, --address <ip>', 'listening host name or ip')
		.option('-x, --peers [peers...]', 'peers list')
		.option('-l, --log <level>', 'log level')
		.option('-s, --snapshot <round>', 'verify snapshot')
		.parse(process.argv);

	var configPath = program.config;
	var appConfig = fs.readFileSync(
		path.resolve(process.cwd(), configPath || 'config.json'),
		'utf8'
	);

	if (!appConfig.length) {
		console.log('Failed to read config file');
		process.exit(1);
	} else {
		try {
			appConfig = JSON.parse(appConfig);
		} catch (err) {
			console.log('Failed to parse config file');
			console.log(err.message);
			process.exit(1);
		}
	}

	if (program.wsPort) {
		appConfig.wsPort = +program.wsPort;
	}

	if (program.httpPort) {
		appConfig.httpPort = +program.httpPort;
	}

	if (program.address) {
		appConfig.address = program.address;
	}

	if (program.database) {
		appConfig.db.database = program.database;
	}

	if (program.peers) {
		if (typeof program.peers === 'string') {
			appConfig.peers.list = program.peers.split(',').map(peer => {
				peer = peer.split(':');
				return {
					ip: peer.shift(),
					wsPort: peer.shift() || appConfig.wsPort,
				};
			});
		} else {
			appConfig.peers.list = [];
		}
	}

	if (program.log) {
		appConfig.consoleLogLevel = program.log;
	}

	if (program.snapshot) {
		appConfig.loading.snapshot = Math.abs(Math.floor(program.snapshot));
	}

	if (process.env.NODE_ENV === 'test') {
		appConfig.coverage = true;
	}

	var validator = new z_schema();
	var valid = validator.validate(appConfig, configSchema.config);

	if (!valid) {
		console.log('Failed to validate config data', validator.getLastErrors());
		process.exit(1);
	} else {
		validateForce(appConfig);
		return appConfig;
	}
}

/**
 * Validates nethash value from constants and sets forging force to false if any.
 * @private
 * @param {Object} configData
 */
function validateForce(configData) {
	if (configData.forging.force) {
		var index = constants.nethashes.indexOf(configData.nethash);

		if (index !== -1) {
			console.log('Forced forging disabled for nethash', configData.nethash);
			configData.forging.force = false;
		}
	}
}

// Exports
module.exports = Config;
