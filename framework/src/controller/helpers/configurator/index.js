const yargs = require('yargs');
const chainModule = require('../../../modules/chain');
const APIModule = require('../../../modules/http_api');
const { config: loggerConfig } = require('../../../components/logger/defaults');
const {
	config: storageConfig,
} = require('../../../components/storage/defaults');
const { config: cacheConfig } = require('../../../components/cache/defaults');
const Configurator = require('./configurator');

const configurator = new Configurator();

configurator.registerSchema(loggerConfig, 'components.logger');
configurator.registerSchema(storageConfig, 'components.storage');
configurator.registerSchema(cacheConfig, 'components.cache');
configurator.registerModule(chainModule);
configurator.registerModule(APIModule);

yargs.command(
	'usage',
	'Show list of supported command line arguments and environment variables.',
	() => {
		console.info(configurator.helpBanner());
		process.exit();
	}
);
yargs.help('help', 'Run the "usage" command to see full list of options');

module.exports = configurator;
