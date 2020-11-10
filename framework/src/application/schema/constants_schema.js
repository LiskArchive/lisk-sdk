/*
 * Copyright © 2019 Lisk Foundation
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
	id: '#constants',
	type: 'object',
	required: [
		'activeDelegates',
		'standbyDelegates',
		'totalAmount',
		'delegateListRoundOffset',
	],
	properties: {
		activeDelegates: {
			type: 'number',
			format: 'oddInteger',
			min: 1,
			const: 101,
			description: 'The default number of delegates allowed to forge a block',
		},
		standbyDelegates: {
			type: 'integer',
			min: 1,
			const: 2,
			description:
				'The default number of standby delegates allowed to forge a block',
		},
		totalAmount: {
			type: 'string',
			format: 'amount',
			const: '10000000000000000',
			description:
				'Total amount of LSK available in network before rewards milestone started',
		},
		delegateListRoundOffset: {
			type: 'number',
			minimum: 0,
			description:
				'Number of rounds before in which the list of delegates will be used for the current round - i.e. The set of active delegates that will be chosen to forge during round `r` will be taken from the list generated in the end of round `r - delegateListRoundOffset`',
		},
	},
	additionalProperties: false,
	default: {
		activeDelegates: 101,
		standbyDelegates: 2,
		// WARNING: When changing totalAmount you also need to change getBlockRewards(int) SQL function!
		totalAmount: '10000000000000000',
		delegateListRoundOffset: 2,
	},
};
