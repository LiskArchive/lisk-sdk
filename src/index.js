const { Application } = require('../framework/src');

// TODO: Remove the use this config helper
const packageJSON = require('../package');
const appConfig = require('../framework/src/modules/chain/helpers/config');

const config = appConfig(packageJSON);

try {
	// To run multiple applications for same network for integration tests
	// TODO: Refactored the way to find unique name for the app
	const app = new Application(
		`${config.network}-${config.httpPort}`,
		config.genesisBlock,
		config.constants,
		{
			components: {
				logger: {
					filename: config.logFileName,
					consoleLogLevel: 'debug',
					fileLogLevel: 'debug',
				},
				cache: {
					...config.redis,
					enabled: config.cacheEnabled,
				},
				storage: config.db,
			},
		}
	);

	app.overrideModuleConfig('chain', { exceptions: config.exceptions, config });

	app
		.run()
		.then(() => app.logger.log('App started...'))
		.catch(err => app.logger.error('App stopped with error', err));
} catch (e) {
	console.error(e);
}
