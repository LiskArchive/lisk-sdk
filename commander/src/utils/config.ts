export const defaultConfig = {
	label: 'beta-sdk-app',
	version: '0.0.0',
	networkVersion: '1.0',
	rootPath: '~/.lisk',
	logger: {
		fileLogLevel: 'info',
		consoleLogLevel: 'info',
		logFileName: 'lisk.log',
	},
	rpc: {
		modes: ['ipc'],
	},
	genesis: {
		blockTime: 10,
		communityIdentifier: 'sdk',
		// eslint-disable-next-line @typescript-eslint/no-magic-numbers
		maxTransactionsSize: 15 * 1024, // Kilo Bytes
		minFeePerByte: 1000,
		baseFees: [],
		modules: {},
	},
	generation: {
		force: false,
		waitThreshold: 2,
		delegates: [], // Copy the delegates info from genesis.json file
	},
	network: {
		seedPeers: [
			{
				ip: '127.0.0.1',
				port: 5000,
			},
		],
		port: 5000,
	},
	transactionPool: {
		maxTransactions: 4096,
		maxTransactionsPerAccount: 64,
		transactionExpiryTime: 3 * 60 * 60 * 1000,
		minEntranceFeePriority: '0',
		minReplacementFeeDifference: '10',
	},
	plugins: {},
};

export const DEFAULT_KEY_DERIVATION_PATH = "m/25519'/134'/0'/0'";
