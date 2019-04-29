const Application = require('./controller/application');
const version = require('./version');
const defaultConfigurator = require('./controller/default_configurator');
const systemDirs = require('./controller/system_dirs');

/**
 * @namespace framework
 * @type {{constants, Application: (module.Application|*), version: string}}
 */
module.exports = {
	Application,
	version,
	systemDirs,
	configurator: defaultConfigurator,
};
