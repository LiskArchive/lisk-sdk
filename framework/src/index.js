const Application = require('./controller/application');
const version = require('./version');
const validator = require('./controller/helpers/validator');

/**
 * @namespace framework
 * @type {{constants, Application: (module.Application|*), version: string}}
 */
module.exports = {
	Application,
	version,
	helpers: {
		validator,
	},
};
