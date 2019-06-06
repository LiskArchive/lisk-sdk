const { createLoggerComponent } = require('../../../components/logger');

let logger;

const createChainLogger = config => {
	if (logger) {
		throw new Error('Chain logger was already initialized!');
	}
	logger = createLoggerComponent(config);

	return logger;
};

module.exports = {
	logger,
	createChainLogger,
};
