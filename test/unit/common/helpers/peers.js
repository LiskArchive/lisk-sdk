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

var randomstring = require('randomstring');

module.exports = {
	generateMatchedAndUnmatchedBroadhashes(unmatchedAmount) {
		var characterNotPresentInValidBroadhash = '@';
		var validBroadhash = randomstring.generate({
			length: 64,
			custom: 'abcdefghijklmnopqrstuvwxyz0123456789!$&_.',
		});
		return _.range(unmatchedAmount).reduce(
			result => {
				result.unmatchedBroadhashes.push(
					randomstring.generate({
						length: 63,
						custom: 'abcdefghijklmnopqrstuvwxyz0123456789!$&_.',
					}) + characterNotPresentInValidBroadhash
				);
				return result;
			},
			{
				matchedBroadhash: validBroadhash,
				unmatchedBroadhashes: [],
			}
		);
	},
};
