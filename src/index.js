const { Application } = require('../framework/src');

// TODO: Remove the use this config helper
const packageJSON = require('../package');
const config = require('../config/devnet/config');
const constants = require('../config/devnet/constants');
const exceptions = require('../config/devnet/exceptions');
const genesisBlock = require('../config/devnet/genesis_block');

const appName = () => `devnet-${config.modules.http_api.httpPort}`;

try {
	// To run multiple applications for same network for integration tests
	// TODO: Refactored the way to find unique name for the app
	const app = new Application(appName, genesisBlock, constants, {
		...config,
		version: packageJSON.version,
		minVersion: packageJSON.lisk.minVersion,
		protocolVersion: packageJSON.lisk.protocolVersion,
	});

	app.overrideModuleOptions('chain', { exceptions });

	app
		.run()
		.then(() => app.logger.log('App started...'))
		.catch(err => {
			app.logger.error('App stopped with error');
			app.logger.error(err);
			process.exit();
		});
} catch (e) {
	console.error(e);
}
