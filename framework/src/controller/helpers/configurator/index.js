const yargs = require('yargs');
const chainModule = require('../../../modules/chain');
const APIModule = require('../../../modules/http_api');
const Index = require('./configurator');

const configurator = new Index();

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
