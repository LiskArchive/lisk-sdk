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

import { MAX_LENGTH_NAME } from './constants';

export const voterStoreSchema = {
	$id: '/dpos/voter',
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

export const nameStoreSchema = {
	$id: '/dpos/name',
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
	$id: '/dpos/store/snapshot',
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
	$id: '/dpos/store/genesis',
	type: 'object',
	required: ['height', 'initRounds', 'initDelegates'],
	properties: {
		height: {
			dataType: 'uint32',
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
	$id: '/dpos/store/previousTimestamp',
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
			minLength: 1,
			maxLength: MAX_LENGTH_NAME,
		},
		generatorKey: {
			dataType: 'bytes',
			fieldNumber: 2,
			minLength: 32,
			maxLength: 32,
		},
		blsKey: {
			dataType: 'bytes',
			fieldNumber: 3,
			minLength: 48,
			maxLength: 48,
		},
		proofOfPossession: {
			dataType: 'bytes',
			fieldNumber: 4,
			minLength: 96,
			maxLength: 96,
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
			minLength: 32,
			maxLength: 32,
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
			minItems: 1,
			maxItems: 20,
			items: {
				type: 'object',
				required: ['delegateAddress', 'amount'],
				properties: {
					delegateAddress: {
						dataType: 'bytes',
						fieldNumber: 1,
						minLength: 20,
						maxLength: 20,
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

export const configSchema = {
	$id: '/dpos/config',
	type: 'object',
	properties: {
		factorSelfVotes: {
			type: 'integer',
			format: 'uint32',
		},
		maxLengthName: {
			type: 'integer',
			format: 'uint32',
		},
		maxNumberSentVotes: {
			type: 'integer',
			format: 'uint32',
		},
		maxNumberPendingUnlocks: {
			type: 'integer',
			format: 'uint32',
		},
		failSafeMissedBlocks: {
			type: 'integer',
			format: 'uint32',
		},
		failSafeInactiveWindow: {
			type: 'integer',
			format: 'uint32',
		},
		punishmentWindow: {
			type: 'integer',
			format: 'uint32',
		},
		roundLength: {
			type: 'integer',
			format: 'uint32',
		},
		bftThreshold: {
			type: 'integer',
			format: 'uint32',
		},
		minWeightStandby: {
			type: 'string',
			format: 'uint64',
		},
		numberActiveDelegates: {
			type: 'integer',
			format: 'uint32',
		},
		numberStandbyDelegates: {
			type: 'integer',
			format: 'uint32',
		},
		tokenIDDPoS: {
			type: 'string',
			format: 'hex',
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
		'numberStandbyDelegates',
		'tokenIDDPoS',
	],
};

export const genesisStoreSchema = {
	$id: '/dpos/module/genesis',
	type: 'object',
	required: ['validators', 'voters', 'snapshots', 'genesisData'],
	properties: {
		validators: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: [
					'address',
					'name',
					'blsKey',
					'proofOfPossession',
					'generatorKey',
					'lastGeneratedHeight',
					'isBanned',
					'pomHeights',
					'consecutiveMissedBlocks',
				],
				properties: {
					address: {
						dataType: 'bytes',
						fieldNumber: 1,
						minLength: 20,
						maxLength: 20,
					},
					name: {
						dataType: 'string',
						fieldNumber: 2,
						minLength: 1,
						maxLength: 20,
					},
					blsKey: {
						dataType: 'bytes',
						fieldNumber: 3,
						minLength: 48,
						maxLength: 48,
					},
					proofOfPossession: {
						dataType: 'bytes',
						fieldNumber: 4,
						minLength: 96,
						maxLength: 96,
					},
					generatorKey: {
						dataType: 'bytes',
						fieldNumber: 5,
						minLength: 32,
						maxLength: 32,
					},
					lastGeneratedHeight: {
						dataType: 'uint32',
						fieldNumber: 6,
					},
					isBanned: {
						dataType: 'boolean',
						fieldNumber: 7,
					},
					pomHeights: {
						type: 'array',
						fieldNumber: 8,
						items: { dataType: 'uint32' },
					},
					consecutiveMissedBlocks: {
						dataType: 'uint32',
						fieldNumber: 9,
					},
				},
			},
		},
		voters: {
			type: 'array',
			fieldNumber: 2,
			items: {
				type: 'object',
				required: ['address', 'sentVotes', 'pendingUnlocks'],
				properties: {
					address: {
						dataType: 'bytes',
						fieldNumber: 1,
						minLength: 20,
						maxLength: 20,
					},
					sentVotes: {
						type: 'array',
						fieldNumber: 2,
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
						fieldNumber: 3,
						items: {
							type: 'object',
							required: ['delegateAddress', 'amount', 'unvoteHeight'],
							properties: {
								delegateAddress: {
									dataType: 'bytes',
									fieldNumber: 1,
									minLength: 20,
									maxLength: 20,
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
			},
		},
		snapshots: {
			type: 'array',
			fieldNumber: 3,
			maxLength: 3,
			items: {
				type: 'object',
				required: ['roundNumber', 'activeDelegates', 'delegateWeightSnapshot'],
				properties: {
					roundNumber: {
						dataType: 'uint32',
						fieldNumber: 1,
					},
					activeDelegates: {
						type: 'array',
						fieldNumber: 2,
						items: { dataType: 'bytes' },
					},
					delegateWeightSnapshot: {
						type: 'array',
						fieldNumber: 3,
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
			},
		},
		genesisData: {
			type: 'object',
			fieldNumber: 4,
			required: ['initRounds', 'initDelegates'],
			properties: {
				initRounds: {
					dataType: 'uint32',
					fieldNumber: 1,
				},
				initDelegates: {
					type: 'array',
					fieldNumber: 2,
					items: { dataType: 'bytes' },
				},
			},
		},
	},
};
