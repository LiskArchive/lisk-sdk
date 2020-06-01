/*
 * Copyright © 2020 Lisk Foundation
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

export const accountAssetSchema = {
	delegate: {
		type: 'object',
		fieldNumber: 1,
		properties: {
			username: { dataType: 'string', fieldNumber: 1 },
			pomHeights: {
				type: 'array',
				items: { dataType: 'uint32' },
				fieldNumber: 2,
			},
			consecutiveMissedBlocks: { dataType: 'uint32', fieldNumber: 3 },
			lastForgedHeight: { dataType: 'uint32', fieldNumber: 4 },
			isBanned: { dataType: 'boolean', fieldNumber: 5 },
			totalVotesReceived: { dataType: 'uint64', fieldNumber: 6 },
		},
		required: [
			'username',
			'pomHeights',
			'consecutiveMissedBlocks',
			'lastForgedHeight',
			'isBanned',
			'totalVotesReceived',
		],
	},
	sentVotes: {
		type: 'array',
		fieldNumber: 2,
		items: {
			type: 'object',
			properties: {
				delegateAddress: {
					dataType: 'bytes',
					fieldNumber: 1,
				},
				amount: {
					dataType: 'uint64',
					fieldNumber: 2,
				},
			},
			required: ['delegateAddress', 'amount'],
		},
	},
	unlocking: {
		type: 'array',
		fieldNumber: 3,
		items: {
			type: 'object',
			properties: {
				delegateAddress: {
					dataType: 'bytes',
					fieldNumber: 1,
				},
				amount: {
					dataType: 'uint64',
					fieldNumber: 2,
				},
				unvoteHeight: {
					dataType: 'uint32',
					fieldNumber: 3,
				},
			},
			required: ['delegateAddress', 'amount', 'unvoteHeight'],
		},
	},
};

export const defaultAccountAsset = {
	delegate: {
		username: '',
		pomHeights: [],
		consecutiveMissedBlocks: 0,
		lastForgedHeight: 0,
		isBanned: false,
		totalVotesReceived: BigInt(0),
	},
	sentVotes: [],
	unlocking: [],
};

export interface AccountAsset {
	delegate: DelegateAccountAsset;
	sentVotes: VoteAccountAsset[];
	unlocking: UnlockingAccountAsset[];
}

export interface DelegateAccountAsset {
	username: string;
	pomHeights: number[];
	consecutiveMissedBlocks: number;
	lastForgedHeight: number;
	isBanned: boolean;
	totalVotesReceived: bigint;
}

export interface VoteAccountAsset {
	delegateAddress: Buffer;
	amount: bigint;
}

export interface UnlockingAccountAsset {
	delegateAddress: Buffer;
	amount: bigint;
	unvoteHeight: number;
}
