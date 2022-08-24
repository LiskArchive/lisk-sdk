/*
 * Copyright © 2022 Lisk Foundation
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
import { BaseStore } from '../../base_store';

export interface DelegateAccount {
	name: string;
	totalVotesReceived: bigint;
	selfVotes: bigint;
	lastGeneratedHeight: number;
	isBanned: boolean;
	pomHeights: number[];
	consecutiveMissedBlocks: number;
}

export const delegateStoreSchema = {
	$id: '/dpos/delegate',
	type: 'object',
	required: [
		'name',
		'totalVotesReceived',
		'selfVotes',
		'lastGeneratedHeight',
		'isBanned',
		'pomHeights',
		'consecutiveMissedBlocks',
	],
	properties: {
		name: {
			dataType: 'string',
			fieldNumber: 1,
		},
		totalVotesReceived: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
		selfVotes: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
		lastGeneratedHeight: {
			dataType: 'uint32',
			fieldNumber: 4,
		},
		isBanned: {
			dataType: 'boolean',
			fieldNumber: 5,
		},
		pomHeights: {
			type: 'array',
			fieldNumber: 6,
			items: { dataType: 'uint32' },
		},
		consecutiveMissedBlocks: {
			dataType: 'uint32',
			fieldNumber: 7,
		},
	},
};

export class DelegateStore extends BaseStore<DelegateAccount> {
	public schema = delegateStoreSchema;
}
