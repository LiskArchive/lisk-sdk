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
};
