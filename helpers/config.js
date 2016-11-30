'use strict';

var fs = require('fs');
var path = require('path');
var z_schema = require('./z_schema.js');
var configSchema = require('../schema/config.js');
var constants = require('../helpers/constants.js');

function Config (configPath) {
	var configData = fs.readFileSync(path.resolve(process.cwd(), (configPath || 'config.json')), 'utf8');

	if (!configData.length) {
		console.log('Failed to read config file');
		process.exit(1);
	} else {
		configData = JSON.parse(configData);
	}

	var validator = new z_schema();
	var valid = validator.validate(configData, configSchema.config);

	if (!valid) {
		console.log('Failed to validate config data', validator.getLastErrors());
		process.exit(1);
	} else {
		validateForce(configData);
		return configData;
	}
}

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
