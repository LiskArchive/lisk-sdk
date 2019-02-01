const _ = require('lodash');
const { Application } = require('../framework/src');
const genesisBlock = require('../config/devnet/genesis_block');
const constants = require('../config/devnet/constants');
const exceptions = require('../config/devnet/exceptions');
const defaultConfig = require('../config/default/config');
const networkConfig = require('../config/devnet/config');

const config = _.mergeWith(
	{},
	defaultConfig,
	networkConfig,
	(objValue, srcValue) => {
		if (_.isArray(objValue)) {
			return srcValue;
		}
		return undefined;
	}
);

try {
	const app = new Application('devnet', genesisBlock, constants, {
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
	});

	app.overrideModuleConfig('chain', { exceptions, config });

	app.run();
	app.logger.log('App started...');
} catch (e) {
	console.error(e);
}
