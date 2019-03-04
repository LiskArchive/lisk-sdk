const domain = require('domain');

const modulesList = {
	accounts: '../modules/accounts.js',
	blocks: '../modules/blocks.js',
	dapps: '../modules/dapps.js',
	delegates: '../modules/delegates.js',
	rounds: '../modules/rounds.js',
	loader: '../modules/loader.js',
	multisignatures: '../modules/multisignatures.js',
	peers: '../modules/peers.js',
	signatures: '../modules/signatures.js',
	transactions: '../modules/transactions.js',
	transport: '../modules/transport.js',
	processTransactions: '../modules/process_transactions.js',
};

module.exports = async scope => {
	const moduleNames = Object.keys(modulesList);

	const modulePromises = moduleNames.map(
		moduleName =>
			new Promise((resolve, reject) => {
				const moduleDomain = domain.create();
				const moduleCb = (err, object) => {
					if (err) return reject(err);

					return resolve(object);
				};

				moduleDomain.on('error', err => {
					scope.components.logger.fatal(`Domain ${moduleName}`, {
						message: err.message,
						stack: err.stack,
					});
				});

				moduleDomain.run(() => {
					scope.components.logger.debug('Loading module', moduleName);
					// eslint-disable-next-line import/no-dynamic-require
					const DynamicModule = require(modulesList[moduleName]);
					return new DynamicModule(moduleCb, scope);
				});
			})
	);

	const resolvedModules = await Promise.all(modulePromises);
	const modules = resolvedModules.reduce(
		(prev, module, index) => ({ ...prev, [moduleNames[index]]: module }),
		{}
	);

	scope.bus.registerModules(modules);

	return modules;
};
