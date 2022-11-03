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
						format: 'lisk32',
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
		governanceTokenID: {
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
		'governanceTokenID',
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
						format: 'lisk32',
						fieldNumber: 1,
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
						format: 'lisk32',
						fieldNumber: 1,
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
									format: 'lisk32',
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
									format: 'lisk32',
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
						items: { dataType: 'bytes', format: 'lisk32' },
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
									format: 'lisk32',
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
					items: { dataType: 'bytes', format: 'lisk32' },
				},
			},
		},
	},
};

const delegateJSONSchema = {
	type: 'object',
	required: [
		'address',
		'name',
		'totalVotesReceived',
		'selfVotes',
		'lastGeneratedHeight',
		'isBanned',
		'pomHeights',
		'consecutiveMissedBlocks',
	],
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
		name: {
			type: 'string',
		},
		totalVotesReceived: {
			type: 'string',
			format: 'uint64',
		},
		selfVotes: {
			type: 'string',
			format: 'uint64',
		},
		lastGeneratedHeight: {
			type: 'integer',
			format: 'uint32',
		},
		isBanned: {
			type: 'boolean',
		},
		pomHeights: {
			type: 'array',
			items: { type: 'integer', format: 'uint32' },
		},
		consecutiveMissedBlocks: {
			type: 'integer',
			format: 'uint32',
		},
	},
};

export const getDelegateRequestSchema = {
	$id: 'modules/dpos/endpoint/getDelegateRequest',
	type: 'object',
	required: ['address'],
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
	},
};

export const getDelegateResponseSchema = {
	$id: 'modules/dpos/endpoint/getDelegateResponse',
	...delegateJSONSchema,
};

export const getVoterRequestSchema = getDelegateRequestSchema;

export const getVoterResponseSchema = {
	$id: 'modules/dpos/endpoint/getVoterResponse',
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
						type: 'string',
						format: 'lisk32',
					},
					amount: {
						type: 'string',
						format: 'uint64',
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
						type: 'string',
						format: 'lisk32',
					},
					amount: {
						type: 'string',
						format: 'uint64',
					},
					unvoteHeight: {
						type: 'integer',
						format: 'uint32',
					},
				},
			},
		},
	},
};

export const getAllDelegatesResponseSchema = {
	$id: 'modules/dpos/endpoint/getAllDelegatesResponse',
	type: 'object',
	required: ['delegates'],
	properties: {
		delegates: {
			type: 'array',
			items: delegateJSONSchema,
		},
	},
};

export const getGovernanceTokenIDResponseSchema = {
	$id: 'modules/dpos/endpoint/getGovernanceTokenIDResponse',
	type: 'object',
	required: ['tokenID'],
	properties: {
		tokenID: {
			type: 'string',
			format: 'hex',
		},
	},
};

export const getValidatorsByStakeRequestSchema = {
	$id: 'modules/dpos/endpoint/getValidatorsByStakeRequest',
	type: 'object',
	properties: {
		limit: {
			type: 'integer',
			format: 'uint32',
		},
	},
};

export const getValidatorsByStakeResponseSchema = {
	$id: 'modules/dpos/endpoint/getValidatorsByStakeResponse',
	type: 'object',
	required: ['validators'],
	properties: {
		validators: {
			type: 'array',
			items: delegateJSONSchema,
		},
	},
};

export const getLockedRewardsRequestSchema = {
	$id: 'modules/dpos/endpoint/getLockedRewardsRequest',
	type: 'object',
	required: ['address', 'tokenID'],
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
		tokenID: {
			type: 'string',
			format: 'hex',
		},
	},
};

export const getLockedRewardsResponseSchema = {
	$id: 'modules/dpos/endpoint/getLockedRewardsResponse',
	type: 'object',
	required: ['rewards'],
	properties: {
		rewards: {
			type: 'string',
			format: 'uint64',
		},
	},
};

export const getLockedVotedAmountRequestSchema = {
	$id: 'modules/dpos/endpoint/getLockedVotedAmountRequest',
	type: 'object',
	required: ['address'],
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
	},
};

export const getLockedVotedAmountResponseSchema = {
	$id: 'modules/dpos/endpoint/getLockedVotedAmountResponse',
	type: 'object',
	required: ['amount'],
	properties: {
		amount: {
			type: 'string',
			format: 'uint64',
		},
	},
};

export const getPendingUnlocksRequestSchema = {
	$id: 'modules/dpos/endpoint/getPendingUnlocksRequest',
	type: 'object',
	required: ['address'],
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
	},
};

export const getPendingUnlocksResponseSchema = {
	$id: 'modules/dpos/endpoint/getPendingUnlocksResponse',
	type: 'object',
	required: ['amount'],
	properties: {
		pendingUnlocks: {
			type: 'array',
			items: {
				type: 'object',
				required: [
					'delegateAddress',
					'amount',
					'unvoteHeight',
					'expectedUnlockableHeight',
					'unlockable',
				],
				properties: {
					delegateAddress: {
						type: 'string',
						format: 'lisk32',
					},
					amount: {
						type: 'string',
						format: 'uint64',
					},
					unvoteHeight: {
						type: 'integer',
						format: 'uint32',
					},
					expectedUnlockableHeight: {
						type: 'integer',
						format: 'uint32',
					},
					unlockable: {
						type: 'boolean',
					},
				},
			},
		},
	},
};
