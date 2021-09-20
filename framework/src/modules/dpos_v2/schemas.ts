/*
 * Copyright © 2021 Lisk Foundation
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

export const voterStoreSchema = {
	type: 'object',
	required: ['sentVotes', 'pendingUnlocks'],
	properties: {
		sentVotes: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['delegateAddress', 'amount'],
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
			},
		},
		pendingUnlocks: {
			type: 'array',
			fieldNumber: 2,
			items: {
				type: 'object',
				required: ['delegateAddress', 'amount', 'unvoteHeight'],
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
			},
		},
	},
};

export const delegateStoreSchema = {
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

export const nameStoreSchema = {
	type: 'object',
	required: ['delegateAddress'],
	properties: {
		delegateAddress: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
	},
};

export const snapshotStoreSchema = {
	type: 'object',
	required: ['activeDelegates', 'delegateWeightSnapshot'],
	properties: {
		activeDelegates: {
			type: 'array',
			fieldNumber: 1,
			items: { dataType: 'bytes' },
		},
		delegateWeightSnapshot: {
			type: 'array',
			fieldNumber: 2,
			items: {
				type: 'object',
				required: ['delegateAddress', 'delegateWeight'],
				properties: {
					delegateAddress: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					delegateWeight: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
				},
			},
		},
	},
};

export const genesisDataStoreSchema = {
	type: 'object',
	required: ['height', 'initRounds', 'initDelegates'],
	properties: {
		height: {
			dataType: 'uint64',
			fieldNumber: 1,
		},
		initRounds: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		initDelegates: {
			type: 'array',
			fieldNumber: 3,
			items: { dataType: 'bytes' },
		},
	},
};

export const previousTimestampStoreSchema = {
	type: 'object',
	required: ['timestamp'],
	properties: {
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
	},
};

export const delegateRegistrationCommandParamsSchema = {
	$id: '/dpos/command/registerDelegateParams',
	type: 'object',
	required: ['name', 'generatorKey', 'blsKey', 'proofOfPossession'],
	properties: {
		name: {
			dataType: 'string',
			fieldNumber: 1,
		},
		generatorKey: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		blsKey: {
			dataType: 'bytes',
			fieldNumber: 3,
		},
		proofOfPossession: {
			dataType: 'bytes',
			fieldNumber: 4,
		},
	},
};

export const updateGeneratorKeyCommandParamsSchema = {
	$id: '/dpos/command/updateGeneratorKeyParams',
	type: 'object',
	required: ['generatorKey'],
	properties: {
		generatorKey: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
	},
};

export const voteCommandParamsSchema = {
	$id: '/dpos/command/voteDelegateParams',
	type: 'object',
	required: ['votes'],
	properties: {
		votes: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['delegateAddress', 'amount'],
				properties: {
					delegateAddress: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					amount: {
						dataType: 'sint64',
						fieldNumber: 2,
					},
				},
			},
		},
	},
};

export const pomCommandParamsSchema = {
	$id: '/dpos/command/reportDelegateMisbehaviorParams',
	type: 'object',
	required: ['header1', 'header2'],
	properties: {
		header1: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		header2: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
	},
};

export const unlockCommandParamsSchema = {
	$id: '/dpos/command/unlockTokenParams',
	type: 'object',
	properties: {},
};

export const configSchema = {
	$id: '/dpos/config',
	type: 'object',
	properties: {
		factorSelfVotes: {
			dataType: 'uint32',
		},
		maxLengthName: {
			dataType: 'uint32',
		},
		maxNumberSentVotes: {
			dataType: 'uint32',
		},
		maxNumberPendingUnlocks: {
			dataType: 'uint32',
		},
		failSafeMissedBlocks: {
			dataType: 'uint32',
		},
		failSafeInactiveWindow: {
			dataType: 'uint32',
		},
		punishmentWindow: {
			dataType: 'uint32',
		},
		roundLength: {
			dataType: 'uint32',
		},
		bftThreshold: {
			dataType: 'uint32',
		},
		minWeightStandby: {
			dataType: 'uint32',
		},
		numberActiveDelegates: {
			dataType: 'uint32',
		},
		tokenIDDPoS: {
			type: 'object',
			properties: {
				chainID: {
					dataType: 'uint32',
				},
				localID: {
					dataType: 'uint32',
				},
			},
			required: ['chainID', 'localID'],
		},
	},
	required: [
		'factorSelfVotes',
		'maxLengthName',
		'maxNumberSentVotes',
		'maxNumberPendingUnlocks',
		'failSafeMissedBlocks',
		'failSafeInactiveWindow',
		'punishmentWindow',
		'roundLength',
		'bftThreshold',
		'minWeightStandby',
		'numberActiveDelegates',
		'tokenIDDPoS',
	],
};
