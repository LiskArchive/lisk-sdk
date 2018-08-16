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
 * @property {Object} rounds.27040
 * @property {number} rounds.27040.rewards_factor
 * @property {number} rounds.27040.fees_factor
 * @property {number} rounds.27040.fees_bonus
 * @property {string[]} senderPublicKey
 * @property {string[]} signatures
 * @property {string[]} multisignatures
 * @property {string[]} votes
 * @todo Add description for the namespace and the properties
 */
module.exports = {
	blockRewards: [],
	delegates: [],
	genesisPublicKey: {
		mainnet: 'd121d3abf5425fdc0f161d9ddb32f89b7750b4bdb0bff7d18b191d4b4bafa6d4',
		testnet: 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
	},
	rounds: {
		27040: { rewards_factor: 2, fees_factor: 2, fees_bonus: 10000000 },
	},
	senderPublicKey: [
		'6140297682817553271', // 12526
		'17693199811026162972', // 12532
		'12745015510836138583', // 34991
		'15516237395249255875', // 34998
		'6377354815333756139', // 34998
		'12466861689592168447', // 35027
		'2778306120620555464', // 36819
		'1371513618457310858', // 43162
		'17975182010363461275', // 660458
		'7393365363305861496', // 734924
		'10835780973515164613', // 734941
		'16597985030226429007', // 734946
		'16651448368467202930', // 734972
		'2716517134501650091', // 734909
		'3580178084951037889', // 735111
		'5153508874902580125', // 735179
	],
	signatures: [
		'5676385569187187158', // 868797
		'5384302058030309746', // 869890
		'9352922026980330230', // 925165
	],
	multisignatures: [
		'14122550998639658526', // 1189962
	],
	votes: [
		'5524930565698900323', // 20407
		'11613486949732674475', // 123300
		'14164134775432642506', // 123333
	],
	inertTransactions: [],
	transactionFee: [],
	// <version>: { start: <start_height>, end: <end_height> }
	blockVersions: {
		0: { start: 1, end: 6901027 },
	},
};
