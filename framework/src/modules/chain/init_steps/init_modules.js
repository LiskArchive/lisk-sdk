const util = require('util');
const async = require('async');

const promisifyParallel = util.promisify(async.parallel);

const modulesList = {
	accounts: '../modules/accounts.js',
	blocks: '../modules/blocks.js',
	dapps: '../modules/dapps.js',
	delegates: '../modules/delegates.js',
	rounds: '../modules/rounds.js',
	loader: '../modules/loader.js',
	multisignatures: '../modules/multisignatures.js',
	peers: '../modules/peers.js',
	system: '../modules/system.js',
	signatures: '../modules/signatures.js',
	transactions: '../modules/transactions.js',
	transport: '../modules/transport.js',
};

module.exports = async scope => {
	const tasks = {};

	Object.keys(modulesList).forEach(name => {
		tasks[name] = function(configModulesCb) {
			const domain = require('domain').create();

			domain.on('error', err => {
				scope.components.logger.fatal(`Domain ${name}`, {
					message: err.message,
					stack: err.stack,
				});
			});

			domain.run(() => {
				scope.components.logger.debug('Loading module', name);
				// eslint-disable-next-line import/no-dynamic-require
				const DynamicModule = require(modulesList[name]);
				return new DynamicModule(configModulesCb, scope);
			});
		};
	});

	const modules = await promisifyParallel(tasks);
	scope.bus.registerModules(modules);

	return modules;
};
