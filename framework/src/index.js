const Application = require('./controller/application');
const samples = require('../samples');
const version = require('./version');
const validator = require('./controller/helpers/validator');

/**
 * @namespace framework
 * @type {{constants, Application: (module.Application|*), version: string}}
 */
module.exports = {
	Application,
	version,
	...samples,
	helpers: {
		validator,
	},
};
