// Parameters passed by `child_process.fork(_, parameters)`
const modulePath = process.argv[2];

const { ChildProcessChannel } = require('./channels');
// eslint-disable-next-line import/no-dynamic-require
const Klass = require(modulePath);

const loadModule = async (config, moduleOptions) => {
	const module = new Klass(moduleOptions);
	const moduleAlias = module.constructor.alias;

	const channel = new ChildProcessChannel(
		moduleAlias,
		module.events,
		module.actions
	);

	await channel.registerToBus(config.socketsPath);

	channel.publish(`${moduleAlias}:registeredToBus`);
	channel.publish(`${moduleAlias}:loading:started`);

	await module.load(channel);

	channel.publish(`${moduleAlias}:loading:finished`);
};

process.on('message', data => {
	if (data.loadModule) {
		loadModule(data.config, data.moduleOptions);
	}
});

// TODO: Removed after https://github.com/LiskHQ/lisk/issues/3210 is fixed
process.on('disconnect', () => {
	process.exit();
});
