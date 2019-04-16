const Application = require('./controller/application');
const GenesisBlockDevnet = require('./modules/chain/defaults/genesis_block_devnet');
const version = require('./version');
const validator = require('./controller/helpers/validator');

/**
 * @namespace framework
 * @type {{constants, Application: (module.Application|*), version: string}}
 */
module.exports = {
	Application,
	GenesisBlockDevnet,
	version,
	helpers: {
		validator,
	},
};
