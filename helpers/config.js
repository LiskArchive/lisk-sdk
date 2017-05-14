'use strict';

var fs = require('fs');
var path = require('path');
var z_schema = require('./z_schema.js');
var configSchema = require('../schema/config.js');
var constants = require('../helpers/constants.js');

/**
 * Loads config.json file
 * @memberof module:helpers
 * @implements {validateForce}
 * @param {string} configPath
 * @returns {Object} configData
 */
function Config (program) {
	var configPath = program.config;
	var appConfig = fs.readFileSync(path.resolve(process.cwd(), (configPath || 'config.json')), 'utf8');

	if (!appConfig.length) {
		console.log('Failed to read config file');
		/**
		 * Exits process gracefully with code 1
		 * @see {@link https://nodejs.org/api/process.html#process_process_exit_code}
		 */
		process.exitCode = 1;
	} else {
		appConfig = JSON.parse(appConfig);
	}

	var validator = new z_schema();
	var valid = validator.validate(appConfig, configSchema.config);

	if (!valid) {
		console.log('Failed to validate config data', validator.getLastErrors());
		/**
		 * Exits process gracefully with code 1
		 * @see {@link https://nodejs.org/api/process.html#process_process_exit_code}
		 */
		process.exitCode = 1;
	} else {
		validateForce(appConfig);

		if (program.port) {
			appConfig.port = program.port;
		}

		if (program.address) {
			appConfig.address = program.address;
		}

		if (program.database) {
			appConfig.db.database = program.database;
		}

		if (program.peers) {
			if (typeof program.peers === 'string') {
				appConfig.peers.list = program.peers.split(',').map(function (peer) {
					peer = peer.split(':');
					return {
						ip: peer.shift(),
						port: peer.shift() || appConfig.port
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
			appConfig.loading.snapshot = Math.abs(
				Math.floor(program.snapshot)
			);
		}

		if (process.env.NODE_ENV === 'test') {
			appConfig.coverage = true;
		}

		return appConfig;
	}
}

/**
 * Validates nethash value from constants and sets forging force to false if any.
 * @private
 * @param {Object} configData
 */
function validateForce (configData) {
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
