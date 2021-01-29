export const defaultConfig = {
	label: 'beta-sdk-app',
	version: '0.0.0',
	networkVersion: '1.0',
	rootPath: '~/.lisk',
	logger: {
		fileLogLevel: 'info',
		consoleLogLevel: 'none',
		logFileName: 'lisk.log',
	},
	rpc: {
		enable: false,
		mode: 'ipc',
		port: 8080,
	},
	genesisConfig: {
		blockTime: 10,
		communityIdentifier: 'sdk',
		// eslint-disable-next-line @typescript-eslint/no-magic-numbers
		maxPayloadLength: 15 * 1024, // Kilo Bytes
		bftThreshold: 68,
		minFeePerByte: 1000,
		baseFees: [
			{
				moduleID: 5,
				assetID: 0,
				baseFee: '1000000000',
			},
		],
		rewards: {
			milestones: [
				'500000000', // Initial Reward
				'400000000', // Milestone 1
				'300000000', // Milestone 2
				'200000000', // Milestone 3
				'100000000', // Milestone 4
			],
			offset: 2160, // Start rewards at 39th block of 22nd round
			distance: 3000000, // Distance between each milestone
		},
		minRemainingBalance: '5000000',
		activeDelegates: 101,
		standbyDelegates: 2,
		delegateListRoundOffset: 2,
	},
	forging: {
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
