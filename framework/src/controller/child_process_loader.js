// Parameters passed by `child_process.fork(_, parameters)`
const modulePath = process.argv[2];
const { moduleOptions, config } = JSON.parse(process.argv[3]);

// eslint-disable-next-line import/no-dynamic-require
const Klass = require(modulePath);
const { ChildProcessChannel } = require('./channels');

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

loadModule();
