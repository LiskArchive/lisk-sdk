const { exec } = require('child_process');

const socketsFolder = '/tmp/childProcessChannelIntegrationTest';
exec(`mkdir -p ${socketsFolder}`);

const socketsPath = {
	root: `unix://${socketsFolder}`,
	pub: `unix://${socketsFolder}/lisk_pub.sock`,
	sub: `unix://${socketsFolder}/lisk_sub.sock`,
	rpc: `unix://${socketsFolder}/lisk_rpc.sock`,
};

const betaChannelConfig = {
	moduleAlias: 'betaAlias',
	events: ['beta1', 'beta2'],
	actions: {
		divideByTwo: {
			handler: async action => action.params / 2,
			isPublic: true,
		},
		divideByThree: {
			handler: async action => action.params / 3,
			isPublic: true,
		},
	},
};

module.exports = {
	betaChannelConfig,
	socketsPath,
};
