/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

/**
 * Description of the namespace.
 *
 * @namespace exceptions
 * @memberof helpers
 * @see Parent: {@link helpers}
 * @property {Array} blockRewards
 * @property {Array} delegates
 * @property {Object} genesisPublicKey
 * @property {string} genesisPublicKey.mainnet
 * @property {string} genesisPublicKey.testnet
 * @property {Object} rounds
 * @property {string[]} senderPublicKey
 * @property {string[]} signatures
 * @property {string[]} multisignatures
 * @property {string[]} votes
 * @todo Add description for the namespace and the properties
 */
module.exports = {
	blockRewards: [
		'11807740622680299921', // 2161
		'5714016151987080352', // 2162
	],
	delegates: [],
	genesisPublicKey: {
		mainnet: 'd121d3abf5425fdc0f161d9ddb32f89b7750b4bdb0bff7d18b191d4b4bafa6d4',
		testnet: 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
	},
	rounds: {},
	senderPublicKey: [
		'5252526207733553499', // 464289
	],
	signatures: [
		'3274071402587084244', // 595491
		'10403141873189588012', // 624550
		'16896494584440078079', // 631670
	],
	multisignatures: [
		'8191213966308378713', // 952880
		'8031165757158212499', // 979109
		'6741135886562440478', // 982288
	],
	votes: [
		'16272500600161825502', // 336424
		'17197328760149985951', // 341635
		'18231026627962552928', // 917323
	],
	inertTransactions: [
		'16394286522174687330', // 1318685 - Vote transaction
		'12298100805070303137', // 3057955 - Delegate transaction
	],
	transactionFee: [],
	// <version>: { start: <start_height>, end: <end_height> }
	blockVersions: {
		0: { start: 1, end: 5932033 },
	},
};
