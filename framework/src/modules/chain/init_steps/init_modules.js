const domain = require('domain');

const modulesList = {
	accounts: '../submodules/accounts',
	blocks: '../submodules/blocks',
	dapps: '../submodules/dapps',
	delegates: '../submodules/delegates',
	rounds: '../submodules/rounds',
	loader: '../submodules/loader',
	multisignatures: '../submodules/multisignatures',
	peers: '../submodules/peers',
	signatures: '../submodules/signatures',
	transactions: '../submodules/transactions',
	transport: '../submodules/transport',
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
