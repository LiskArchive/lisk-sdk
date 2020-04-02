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

import { deepFreeze } from './deep_freeze';
import { ForgerList, ForgersList } from '../../src/types';

export const delegateLists = deepFreeze([
	{ round: 17, delegates: ['a', 'b', 'c'], standby: [] },
	{ round: 16, delegates: ['a', 'b', 'c'], standby: [] },
	{ round: 15, delegates: ['a', 'b', 'c'], standby: [] },
	{ round: 14, delegates: ['a', 'b', 'c'], standby: [] },
	{ round: 13, delegates: ['a', 'b', 'c'], standby: [] },
	{ round: 12, delegates: ['a', 'b', 'c'], standby: [] },
	{ round: 11, delegates: ['a', 'b', 'c'], standby: [] },
	{ round: 10, delegates: ['a', 'b', 'c'], standby: [] },
	{ round: 9, delegates: ['a', 'b', 'c'], standby: [] },
	{ round: 8, delegates: ['a', 'b', 'c'], standby: [] },
	{ round: 7, delegates: ['a', 'b', 'c'], standby: [] },
	{ round: 6, delegates: ['a', 'b', 'c'], standby: [] },
	{ round: 5, delegates: ['a', 'b', 'c'], standby: [] },
	{ round: 4, delegates: ['a', 'b', 'c'], standby: [] },
	{ round: 3, delegates: ['a', 'b', 'c'], standby: [] },
	{ round: 2, delegates: ['a', 'b', 'c'], standby: [] },
	{ round: 1, delegates: ['a', 'b', 'c'], standby: [] },
]);

interface ActiveDelegateList {
	readonly publicKey: string;
	readonly activeRounds: number[];
}

export const generateDelegateLists = (
	{ publicKey, activeRounds }: ActiveDelegateList,
	lists = delegateLists,
): ForgersList => {
	return lists.map((list: ForgerList) => {
		if (activeRounds.includes(list.round)) {
			return {
				round: list.round,
				delegates: [publicKey, ...list.delegates].slice(0, 3),
				standby: [],
			};
		}
		return list;
	});
};

export const generateDelegateListsWithStandby = (
	{ publicKey, activeRounds }: ActiveDelegateList,
	lists = delegateLists,
): ForgersList => {
	return lists.map((list: ForgerList) => {
		if (activeRounds.includes(list.round)) {
			return {
				round: list.round,
				delegates: [...list.delegates].slice(0, 3),
				standby: [publicKey],
			};
		}
		return list;
	});
};
