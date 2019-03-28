// Parameters passed by `child_process.fork(_, parameters)`
const modulePath = process.argv[2];
const { moduleOptions, config } = JSON.parse(process.argv[3]);

const { ChildProcessChannel } = require('./channels');
// eslint-disable-next-line import/no-dynamic-require
const Klass = require(modulePath);

const loadModule = async () => {
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

// TODO: Removed after https://github.com/LiskHQ/lisk/issues/3210 is fixed
process.on('disconnect', () => {
	process.exit();
});

loadModule();
