const ChildProcessChannel = require('../../../../../src/controller/channels/child_process_channel');
const { betaChannelConfig, socketsPath } = require('./child_process_helper');

const childProcessChannelBeta = new ChildProcessChannel(
	betaChannelConfig.moduleAlias,
	betaChannelConfig.events,
	betaChannelConfig.actions
);

const startChannelInChildProcess = async () => {
	await childProcessChannelBeta.registerToBus(socketsPath);
	process.send({ child: 'ready' });
};

process.on('message', m => {
	process.send({ fromChild: m });
	const { method, eventName, eventData } = m;

	try {
		childProcessChannelBeta[method](eventName, eventData);
	} catch (err) {
		process.send({ err });
	}
});

startChannelInChildProcess().catch(err => {
	console.error(err);
	process.exit(1);
});

process.on('SIGTERM', () => {
	childProcessChannelBeta.cleanup().then(() => process.exit());
});
