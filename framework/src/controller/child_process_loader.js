// Parameters passed by `child_process.fork(_, parameters)`
const modulePath = process.argv[2];
const moduleOptions = JSON.parse(process.argv[3]);

// eslint-disable-next-line import/no-dynamic-require
const Klass = require(modulePath);
const { ChildProcessChannel } = require('./channels');

const loadModule = async options => {
	const module = new Klass(options);
	const moduleAlias = module.constructor.alias;

	const channel = new ChildProcessChannel(
		moduleAlias,
		module.events,
		module.actions
	);

	await channel.registerToBus(options.socketsPath);

	channel.publish(`${moduleAlias}:registeredToBus`);
	channel.publish(`${moduleAlias}:loading:started`);

	await module.load(channel);

	channel.publish(`${moduleAlias}:loading:finished`);
};

loadModule(moduleOptions);
