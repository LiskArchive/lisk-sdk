'use strict';
/**
 * @namespace exceptions
 * @memberof module:helpers
 * @property {object} genesisPublicKey
 * @property {string} genesisPublicKey.mainnet
 * @property {string} genesisPublicKey.testnet
 * @property {Strin[]} senderPublicKey
 * @property {Strin[]} signatures
 * @property {Strin[]} multisignatures
 * @property {Strin[]} votes
 */	
module.exports = {
	blockRewards: [],
	delegates: [],
	genesisPublicKey: {
		mainnet: 'd121d3abf5425fdc0f161d9ddb32f89b7750b4bdb0bff7d18b191d4b4bafa6d4',
		testnet: 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
	},
	rounds: {},
	senderPublicKey: [],
	signatures: [],
	multisignatures: [],
	votes: [],
	inertTransactions: []
};
