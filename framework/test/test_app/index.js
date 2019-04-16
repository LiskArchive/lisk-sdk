const path = require('path');
const {
	Application,
	helpers: { configurator },
	/* eslint-disable import/no-unresolved */
} = require('../../src');

const packageJSON = require('../../package');

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
	configurator.loadConfigFile(path.resolve(__dirname, '../fixtures/config/devnet/config'));
	configurator.loadConfigFile(path.resolve(__dirname, '../fixtures/config/devnet/exceptions'), 'modules.chain.exceptions');
	const genesisBlock = require('../fixtures/config/devnet/genesis_block');

	const config = configurator.getConfig();

	// To run multiple applications for same network for integration tests
	const appName = `lisk-devnet-${config.modules.http_api.httpPort}`;

	/*
	TODO: Merge 3rd and 4th argument into one single object that would come from config/NETWORK/config.json
	Exceptions and constants.js will be removed.
	 */
	const app = new Application(appName, genesisBlock, config);

	app
		.run()
		.then(() => app.logger.log('App started...'))
		.catch(error => {
			if (error instanceof Error) {
				app.logger.error('App stopped with error', error.message);
				app.logger.debug(error.stack);
			} else {
				app.logger.error('App stopped with error', error);
			}
			process.exit();
		});
} catch (e) {
	console.error('Application start error.', e);
	process.exit();
}
