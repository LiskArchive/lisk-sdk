const os = require('os');
const num = 10;

const followers = new Array(num).fill(0).map((_, i) => ({
	name: `follower_${i}`,
	script: './bin/run',
	args: 'start --api-http --api-ws',
	interpreter: 'node',
	env: {
		LISK_LOG_LEVEL: 'debug',
		LISK_NETWORK: 'alphanet',
		LISK_PORT: 7667 + i + 1,
		LISK_API_WS_PORT: 7887 + i + 1,
		LISK_SEED_PEERS: `127.0.0.1:7667`,
		LISK_DATA_PATH: `${os.tmpdir()}/follower_${i}`,
	},
}));

module.exports = {
	apps: [
		{
			name: 'seed',
			script: './bin/run',
			args: 'start --api-http --api-ws',
			interpreter: 'node',
			env: {
				LISK_LOG_LEVEL: 'debug',
				LISK_NETWORK: 'default',
			},
		},
		...followers,
	],
};
