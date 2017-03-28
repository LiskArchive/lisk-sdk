'use strict';

module.exports = {
	activeDelegates: 101,
	addressLength: 208,
	blockHeaderLength: 248,
	blockReceiptTimeOut: 20, // 2 blocks
	confirmationLength: 77,
	epochTime: new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)),
	fees: {
		send: 10000000,
		vote: 100000000,
		secondsignature: 500000000,
		delegate: 2500000000,
		multisignature: 500000000,
		dapp: 2500000000
	},
	feeStart: 1,
	feeStartVolume: 10000 * 100000000,
	fixedPoint: Math.pow(10, 8),
	maxAddressesLength: 208 * 128,
	maxAmount: 100000000,
	maxConfirmations: 77 * 100,
	maxPayloadLength: 1024 * 1024,
	maxPeers: 100,
	maxRequests: 10000 * 12,
	maxSharedTxs: 100,
	maxSignaturesLength: 196 * 256,
	maxTxsPerBlock: 25,
	minBroadhashConsensus: 51,
	nethashes: [
		// Mainnet
		'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
		// Testnet
		'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba'
	],
	numberLength: 100000000,
	requestLength: 104,
	rewards: {
		milestones: [
			500000000, // Initial Reward
			400000000, // Milestone 1
			300000000, // Milestone 2
			200000000, // Milestone 3
			100000000  // Milestone 4
		],
		offset: 2160,      // Start rewards at block (n)
		distance: 3000000, // Distance between each milestone
	},
	signatureLength: 196,
	totalAmount: 10000000000000000,
	unconfirmedTransactionTimeOut: 10800 // 1080 blocks
};
