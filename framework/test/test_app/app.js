const path = require('path');
const {
	Application,
	helpers: { configurator },
	/* eslint-disable import/no-unresolved */
} = require('../../src');

const packageJSON = require('../../package');

process.env.NODE_ENV = 'test';

let app;

const appConfig = {
	app: {
		version: packageJSON.version,
		minVersion: packageJSON.lisk.minVersion,
		protocolVersion: packageJSON.lisk.protocolVersion,
	},
};

// Support for PROTOCOL_VERSION only for tests
if (process.env.NODE_ENV === 'test' && process.env.PROTOCOL_VERSION) {
	appConfig.app.protocolVersion = process.env.PROTOCOL_VERSION;
}

try {
	// TODO: I would convert config.json to .JS
	configurator.loadConfig(appConfig);
	configurator.loadConfigFile(
		path.resolve(__dirname, '../fixtures/config/devnet/config')
	);
	configurator.loadConfigFile(
		path.resolve(__dirname, '../fixtures/config/devnet/exceptions'),
		'modules.chain.exceptions'
	);
	const genesisBlock = require('../fixtures/config/devnet/genesis_block');

	const config = configurator.getConfig({}, { failOnInvalidArg: false });

	// To run multiple applications for same network for integration tests
	config.app.label = `lisk-devnet-${config.modules.http_api.httpPort}`;

	app = new Application(genesisBlock, config);
} catch (e) {
	console.error('Application start error.', e);
	process.exit();
}

module.exports = app;
