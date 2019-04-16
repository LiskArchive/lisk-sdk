const {
	Application,
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

try {
	// TODO: I would convert config.json to .JS
	const networkConfig = require('../fixtures/config/devnet/config');
	// TODO: Merge constants and exceptions with the above config.
	const exceptions = require('../fixtures/config/devnet/exceptions');
	const genesisBlock = require('../fixtures/config/devnet/genesis_block');

	// To run multiple applications for same network for integration tests
	const appName = config => `lisk-devnet-${config.modules.http_api.httpPort}`;

	/*
	TODO: Merge 3rd and 4th argument into one single object that would come from config/NETWORK/config.json
	Exceptions and constants.js will be removed.
	 */
	const app = new Application(appName, genesisBlock, [
		networkConfig,
		appConfig,
	]);

	app.overrideModuleOptions('chain', { exceptions });

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
