const domain = require('domain');

const submodulesList = {
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
	const submoduleNames = Object.keys(submodulesList);

	const submodulePromises = submoduleNames.map(
		submoduleName =>
			new Promise((resolve, reject) => {
				const submoduleDomain = domain.create();
				const submoduleCb = (err, object) => {
					if (err) return reject(err);

					return resolve(object);
				};

				submoduleDomain.on('error', err => {
					scope.components.logger.fatal(`Domain ${submoduleName}`, {
						message: err.message,
						stack: err.stack,
					});
				});

				submoduleDomain.run(() => {
					scope.components.logger.debug('Loading submodule', submoduleName);
					// eslint-disable-next-line import/no-dynamic-require
					const DynamicModule = require(submodulesList[submoduleName]);
					return new DynamicModule(submoduleCb, scope);
				});
			})
	);

	const resolvedSubodules = await Promise.all(submodulePromises);
	const submodules = resolvedSubodules.reduce(
		(prev, module, index) => ({ ...prev, [submoduleNames[index]]: module }),
		{}
	);

	scope.bus.registerModules(submodules);

	return submodules;
};
