const util = require('util');
const async = require('async');

const promisifyParallel = util.promisify(async.parallel);

module.exports = async ({
	modulesList,
	config,
	storage,
	logger,
	schema,
	genesisBlock,
	network,
	webSocket,
	bus,
	sequence,
	balanceSequence,
	logic,
	lastCommit,
	build,
}) => {
	const modules = [];
	const tasks = {};

	Object.keys(modulesList).forEach(name => {
		tasks[name] = function(configModulesCb) {
			const domain = require('domain').create();

			domain.on('error', err => {
				logger.fatal(`Domain ${name}`, {
					message: err.message,
					stack: err.stack,
				});
			});

			domain.run(() => {
				logger.debug('Loading module', name);
				// eslint-disable-next-line import/no-dynamic-require
				const DynamicModule = require(`../${modulesList[name]}`);
				const obj = new DynamicModule(configModulesCb, {
					config,
					storage,
					logger,
					schema,
					genesisBlock,
					network,
					webSocket,
					bus,
					sequence,
					balanceSequence,
					logic,
					lastCommit,
					build,
				});
				modules.push(obj);
			});
		};
	});

	return promisifyParallel(tasks);
};
