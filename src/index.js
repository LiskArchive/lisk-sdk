const { Application } = require('../framework/src');

const {
	DappTransaction,
	InTransferTransaction,
	OutTransferTransaction,
} = require('./transactions');

// TODO: Remove the use this config helper
const packageJSON = require('../package');
const appConfig = require('../framework/src/modules/chain/helpers/config');

const config = appConfig(packageJSON);

const appName = () => `${config.network}-${config.httpPort}`;

try {
	// To run multiple applications for same network for integration tests
	// TODO: Refactored the way to find unique name for the app
	const app = new Application(appName, config.genesisBlock, config.constants, {
		ipc: config.ipc,
		components: {
			logger: {
				filename: config.logFileName,
				consoleLogLevel: config.consoleLogLevel || 'debug',
				fileLogLevel: config.fileLogLevel || 'debug',
			},
			cache: {
				...config.redis,
				enabled: config.cacheEnabled,
			},
			storage: config.db,
		},
		initialState: {
			nethash: config.nethash,
			version: config.version,
			wsPort: config.wsPort,
			httpPort: config.httpPort,
			minVersion: config.minVersion,
			protocolVersion: config.protocolVersion,
			nonce: config.nonce,
		},
	});

	app.registerTransaction(DappTransaction, { transactionType: 5 });
	app.registerTransaction(InTransferTransaction, { transactionType: 6 });
	app.registerTransaction(OutTransferTransaction, { transactionType: 7 });

	app.overrideModuleOptions('chain', { exceptions: config.exceptions, config });
	app.overrideModuleOptions('httpApi', { config });

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
	console.error(e);
}
