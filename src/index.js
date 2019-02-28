const path = require('path');
const { Application } = require('../framework/src');

// TODO: Remove the use this config helper
const packageJSON = require('../package');
let config = require('../config/devnet/config');
const constants = require('../config/devnet/constants');
const exceptions = require('../config/devnet/exceptions');
const genesisBlock = require('../config/devnet/genesis_block');

// TODO: WIll be resolved with issue https://github.com/LiskHQ/lisk/issues/2976
const args = process.argv.slice(2);
const index = args.indexOf('-c');
if (index >= 0) {
	// eslint-disable-next-line import/no-dynamic-require
	config = require(path.resolve(args[index + 1]));
}

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
