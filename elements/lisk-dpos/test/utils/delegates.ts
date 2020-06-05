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
	{
		round: 17,
		delegates: [
			Buffer.from('a', 'hex'),
			Buffer.from('b', 'hex'),
			Buffer.from('c', 'hex'),
		],
		standby: [],
	},
	{
		round: 16,
		delegates: [
			Buffer.from('a', 'hex'),
			Buffer.from('b', 'hex'),
			Buffer.from('c', 'hex'),
		],
		standby: [],
	},
	{
		round: 15,
		delegates: [
			Buffer.from('a', 'hex'),
			Buffer.from('b', 'hex'),
			Buffer.from('c', 'hex'),
		],
		standby: [],
	},
	{
		round: 14,
		delegates: [
			Buffer.from('a', 'hex'),
			Buffer.from('b', 'hex'),
			Buffer.from('c', 'hex'),
		],
		standby: [],
	},
	{
		round: 13,
		delegates: [
			Buffer.from('a', 'hex'),
			Buffer.from('b', 'hex'),
			Buffer.from('c', 'hex'),
		],
		standby: [],
	},
	{
		round: 12,
		delegates: [
			Buffer.from('a', 'hex'),
			Buffer.from('b', 'hex'),
			Buffer.from('c', 'hex'),
		],
		standby: [],
	},
	{
		round: 11,
		delegates: [
			Buffer.from('a', 'hex'),
			Buffer.from('b', 'hex'),
			Buffer.from('c', 'hex'),
		],
		standby: [],
	},
	{
		round: 10,
		delegates: [
			Buffer.from('a', 'hex'),
			Buffer.from('b', 'hex'),
			Buffer.from('c', 'hex'),
		],
		standby: [],
	},
	{
		round: 9,
		delegates: [
			Buffer.from('a', 'hex'),
			Buffer.from('b', 'hex'),
			Buffer.from('c', 'hex'),
		],
		standby: [],
	},
	{
		round: 8,
		delegates: [
			Buffer.from('a', 'hex'),
			Buffer.from('b', 'hex'),
			Buffer.from('c', 'hex'),
		],
		standby: [],
	},
	{
		round: 7,
		delegates: [
			Buffer.from('a', 'hex'),
			Buffer.from('b', 'hex'),
			Buffer.from('c', 'hex'),
		],
		standby: [],
	},
	{
		round: 6,
		delegates: [
			Buffer.from('a', 'hex'),
			Buffer.from('b', 'hex'),
			Buffer.from('c', 'hex'),
		],
		standby: [],
	},
	{
		round: 5,
		delegates: [
			Buffer.from('a', 'hex'),
			Buffer.from('b', 'hex'),
			Buffer.from('c', 'hex'),
		],
		standby: [],
	},
	{
		round: 4,
		delegates: [
			Buffer.from('a', 'hex'),
			Buffer.from('b', 'hex'),
			Buffer.from('c', 'hex'),
		],
		standby: [],
	},
	{
		round: 3,
		delegates: [
			Buffer.from('a', 'hex'),
			Buffer.from('b', 'hex'),
			Buffer.from('c', 'hex'),
		],
		standby: [],
	},
	{
		round: 2,
		delegates: [
			Buffer.from('a', 'hex'),
			Buffer.from('b', 'hex'),
			Buffer.from('c', 'hex'),
		],
		standby: [],
	},
	{
		round: 1,
		delegates: [
			Buffer.from('a', 'hex'),
			Buffer.from('b', 'hex'),
			Buffer.from('c', 'hex'),
		],
		standby: [],
	},
]);

interface ActiveDelegateList {
	readonly address: Buffer;
	readonly activeRounds: number[];
}

export const generateDelegateLists = (
	{ address, activeRounds }: ActiveDelegateList,
	lists = delegateLists,
): ForgersList => {
	return lists.map((list: ForgerList) => {
		if (activeRounds.includes(list.round)) {
			return {
				round: list.round,
				delegates: [address, ...list.delegates].slice(0, 3),
				standby: [],
			};
		}
		return list;
	});
};

export const generateDelegateListsWithStandby = (
	{ address, activeRounds }: ActiveDelegateList,
	lists = delegateLists,
): ForgersList => {
	return lists.map((list: ForgerList) => {
		if (activeRounds.includes(list.round)) {
			return {
				round: list.round,
				delegates: [...list.delegates].slice(0, 3),
				standby: [address],
			};
		}
		return list;
	});
};
