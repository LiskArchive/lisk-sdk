export const defaultConfig = {
	system: {
		dataPath: '~/.lisk/beta-sdk-app',
		keepEventsForHeights: 300,
		logLevel: 'info',
	},
	rpc: {
		modes: ['ipc'],
		port: 7887,
		host: '127.0.0.1',
	},
	network: {
		version: '1.0',
		seedPeers: [],
		port: 7667,
	},
	transactionPool: {
		maxTransactions: 4096,
		maxTransactionsPerAccount: 64,
		transactionExpiryTime: 3 * 60 * 60 * 1000,
		minEntranceFeePriority: '0',
		minReplacementFeeDifference: '10',
	},
	genesis: {
		block: {
			fromFile: './config/genesis_block.blob',
		},
		blockTime: 10,
		bftBatchSize: 103,
		communityIdentifier: 'sdk',
		// eslint-disable-next-line @typescript-eslint/no-magic-numbers
		maxTransactionsSize: 15 * 1024, // Kilo Bytes
		minFeePerByte: 1000,
	},
	generator: {
		keys: {},
	},
	modules: {},
	plugins: {},
};

export const DEFAULT_KEY_DERIVATION_PATH = "m/25519'/134'/0'/0'";
