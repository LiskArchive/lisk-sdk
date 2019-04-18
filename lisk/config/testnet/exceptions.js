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

module.exports = {
	blockRewards: [
		'11807740622680299921', // 2161
		'5714016151987080352', // 2162
	],
	senderPublicKey: [
		'5252526207733553499', // 464289
	],
	signatures: [
		'3274071402587084244', // 595491
		'10403141873189588012', // 624550
		'16896494584440078079', // 631670
	],
	// transfer transaction previously with null byte in the data field
	// SELECT * FROM transfer WHERE position('\x00' in data) > 0;
	transactionWithNullByte: ['10589655532517440995'], // 6109391
	multisignatures: [
		'8191213966308378713', // 952880
		'8031165757158212499', // 979109
		'6741135886562440478', // 982288
	],
	votes: [
		'16272500600161825502', // 336424
		'17197328760149985951', // 341635
		'18231026627962552928', // 917323
		'15449731671927352923', // 492382
		'13473660246370752329', // 1305925
	],
	inertTransactions: [
		'16394286522174687330', // 1318685 - Vote transaction
		'12298100805070303137', // 3057955 - Delegate transaction
	],
	recipientLeadingZero: {
		// transaction ID to address map
		// select id, "recipientId" from trs where left("recipientId", 1) = '0' and "recipientId" != '0L' ORDER BY "rowId"
		'12710869213547423905': '000123L',
		'4595252596856199985': '000123L',
		'4962453608347426857': '06076671634347365051L',
		'14029161570134180080': '03333333333333333333L',
		'11850546615651855419': '0123L',
		'16785481052094374144': '0123L',
		'1962750879300467095': '014377589660081535605L',
	},
	recipientExceedingUint64: {
		// transaction ID to address map
		// select id, "recipientId" from (select id, "recipientId", CAST(left("recipientId", -1) AS numeric) AS address_number FROM trs ORDER BY "rowId") as converted_table WHERE address_number > 18446744073709551615
		'393955899193580559': '19961131544040416558L',
		'2595217996098726177': '20906309950204158498L',
		'2851909953078287800': '221360928884514619392L',
		'7551953192792882354': '442721857769029238784L',
		'6669246371367929130': '442721857769029238784L',
		'14879617323763807152': '442721857769029238784L',
		'3854891010578818255': '424275113695319687168L',
		'5463681318391195043': '129127208515966861312L',
	},
	precedent: {
		disableDappTransfer: 5594491, // Disable Dapp Transfer at this block height
	},
	// <version>: { start: <start_height>, end: <end_height> }
	blockVersions: {
		0: { start: 1, end: 5932033 },
	},
	roundVotes: [
		// For round vote exceptions, we do not update the votes for the delegates included in the transaction
		'17197328760149985951',
	],
	duplicatedSignatures: {
		'15181013796707110990': [
			'2ec5bbc4ff552f991262867cd8f1c30a417e4596e8343d882b7c4fc86288b9e53592031f3de75ffe8cf4d431a7291b76c758999bb52f46a4da62a27c8901b60a',
			'36d5c7da5f54007e22609105570fad04597f4f2b00d46baba603c213eaed8de55e9f3e5d0f39789dbc396330b2d9d4da46b7d67187075e86220bc0341c3f7802',
		],
		'7424755700677996971': [
			'e54fc5499e1c75c32d8b68590e6259a48ba764ff2dd3044aa3d46f463a06d309c11a281e819e8f7c80d875327a01e87bc1f5b9cd093d5b092495897c8b2bf90c',
			'2eb06bf528d60231a6b93a4d03b02200c938692e8a92d51d4dbaf94087b2e1261a904eb00cba4a0ed7e9d7e6a996666d4cfe3b7011a64252a8a286b8111b4701',
		],
	},
	/**
	 * In modules/delegates.js we are using generateDelegateList
	 * to get the list of forgers for the round. However, we are
	 * also caching this list to reduce calls to the database.
	 * In the rounds below, using cache, creates forks.
	 * See: https://github.com/LiskHQ/lisk/pull/2543#pullrequestreview-178505587
	 *
	 * So we are using the exception key below to skip caching for the rounds provided in the array.
	 * */
	ignoreDelegateListCacheForRounds: [
		19,
		20,
		21,
		22,
		26,
		27,
		29,
		31,
		34,
		42,
		58,
		61,
		81,
		83,
		116,
	],
};
