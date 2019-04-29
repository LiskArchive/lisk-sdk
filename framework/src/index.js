const Application = require('./controller/application');
const version = require('./version');
const helpers = require('./controller/helpers');

/**
 * @namespace framework
 * @type {{constants, Application: (module.Application|*), version: string}}
 */
module.exports = {
	Application,
	version,
	helpers,
};
