const Application = require('./controller/application');
const version = require('./version');
const configurator = require('./controller/configurator');
const systemDirs = require('./controller/system_dirs');

/**
 * @namespace framework
 * @type {{constants, Application: (module.Application|*), version: string}}
 */
module.exports = {
	Application,
	version,
	systemDirs,
	configurator,
};
