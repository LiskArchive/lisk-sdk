const ChildProcessChannel = require('../../../../../src/controller/channels/child_process_channel');
const { betaChannelConfig, socketsPath } = require('./child_process_helper');

const startChannelInChildProcess = async () => {
	const childProcessChannelBeta = new ChildProcessChannel(
		betaChannelConfig.moduleAlias,
		betaChannelConfig.events,
		betaChannelConfig.actions
	);

	await childProcessChannelBeta.registerToBus(socketsPath);
	process.send({ child: 'ready' });

	process.once('exit', () => {
		childProcessChannelBeta.cleanup();
	});
};

startChannelInChildProcess()
	.then(() => process.exit())
	.catch(err => {
		console.error(err);
		process.exit(1);
	});
