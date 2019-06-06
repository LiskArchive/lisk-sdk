const { createStorageComponent } = require('../../../components/storage');

let storage;

const createChainStorage = (config, logger) => {
	if (storage) {
		throw new Error('Chain storage was already initialized!');
	}

	storage = createStorageComponent(config, logger);

	return storage;
};

module.exports = {
	storage,
	createChainStorage,
};
