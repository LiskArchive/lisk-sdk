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

const { deepFreeze } = require('../../../../../../utils/deep_freeze');

const delegateLists = deepFreeze([
	{ round: 15, delegatePublicKeys: ['a', 'b', 'c'] },
	{ round: 14, delegatePublicKeys: ['a', 'b', 'c'] },
	{ round: 13, delegatePublicKeys: ['a', 'b', 'c'] },
	{ round: 12, delegatePublicKeys: ['a', 'b', 'c'] },
	{ round: 11, delegatePublicKeys: ['a', 'b', 'c'] },
	{ round: 10, delegatePublicKeys: ['a', 'b', 'c'] },
	{ round: 9, delegatePublicKeys: ['a', 'b', 'c'] },
	{ round: 8, delegatePublicKeys: ['a', 'b', 'c'] },
	{ round: 7, delegatePublicKeys: ['a', 'b', 'c'] },
	{ round: 6, delegatePublicKeys: ['a', 'b', 'c'] },
	{ round: 5, delegatePublicKeys: ['a', 'b', 'c'] },
	{ round: 4, delegatePublicKeys: ['a', 'b', 'c'] },
	{ round: 3, delegatePublicKeys: ['a', 'b', 'c'] },
	{ round: 2, delegatePublicKeys: ['a', 'b', 'c'] },
	{ round: 1, delegatePublicKeys: ['a', 'b', 'c'] },
]);

const generateDelegateLists = (
	{ publicKey, activeRounds, delegateListRoundOffset },
	lists = delegateLists,
) => {
	// eslint-disable-next-line no-param-reassign
	activeRounds = activeRounds.map(round => round - delegateListRoundOffset);
	return lists.map(list => {
		if (activeRounds.includes(list.round)) {
			return {
				round: list.round,
				delegatePublicKeys: [publicKey, ...list.delegatePublicKeys].slice(0, 3),
			};
		}
		return list;
	});
};
module.exports = { generateDelegateLists, delegateLists };
