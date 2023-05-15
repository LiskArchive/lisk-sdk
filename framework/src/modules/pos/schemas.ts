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

import {
	MAX_COMMISSION,
	MAX_NUMBER_BYTES_Q96,
	TOKEN_ID_LENGTH,
	BLS_PUBLIC_KEY_LENGTH,
	BLS_POP_LENGTH,
	ED25519_PUBLIC_KEY_LENGTH,
	MAX_LENGTH_NAME,
} from './constants';

export const validatorRegistrationCommandParamsSchema = {
	$id: '/pos/command/registerValidatorParams',
	type: 'object',
	required: ['name', 'blsKey', 'proofOfPossession', 'generatorKey'],
	properties: {
		name: {
			dataType: 'string',
			fieldNumber: 1,
			minLength: 1,
			maxLength: MAX_LENGTH_NAME,
		},
		blsKey: {
			dataType: 'bytes',
			minLength: BLS_PUBLIC_KEY_LENGTH,
			maxLength: BLS_PUBLIC_KEY_LENGTH,
			fieldNumber: 2,
		},
		proofOfPossession: {
			dataType: 'bytes',
			minLength: BLS_POP_LENGTH,
			maxLength: BLS_POP_LENGTH,
			fieldNumber: 3,
		},
		generatorKey: {
			dataType: 'bytes',
			minLength: ED25519_PUBLIC_KEY_LENGTH,
			maxLength: ED25519_PUBLIC_KEY_LENGTH,
			fieldNumber: 4,
		},
	},
};

export const updateGeneratorKeyCommandParamsSchema = {
	$id: '/pos/command/updateGeneratorKeyParams',
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

export const stakeCommandParamsSchema = {
	$id: '/pos/command/stakeValidatorParams',
	type: 'object',
	required: ['stakes'],
	properties: {
		stakes: {
			type: 'array',
			fieldNumber: 1,
			minItems: 1,
			maxItems: 20,
			items: {
				type: 'object',
				required: ['validatorAddress', 'amount'],
				properties: {
					validatorAddress: {
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

export const reportMisbehaviorCommandParamsSchema = {
	$id: '/pos/command/reportMisbehaviorParams',
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

export const changeCommissionCommandParamsSchema = {
	$id: '/pos/command/changeCommissionCommandParams',
	type: 'object',
	required: ['newCommission'],
	properties: {
		newCommission: {
			dataType: 'uint32',
			fieldNumber: 1,
			maximum: MAX_COMMISSION,
		},
	},
};

export const configSchema = {
	$id: '/pos/config',
	type: 'object',
	properties: {
		factorSelfStakes: {
			type: 'integer',
			format: 'uint32',
		},
		maxLengthName: {
			type: 'integer',
			format: 'uint32',
		},
		maxNumberSentStakes: {
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
		minWeightStandby: {
			type: 'string',
			format: 'uint64',
		},
		numberActiveValidators: {
			type: 'integer',
			format: 'uint32',
		},
		numberStandbyValidators: {
			type: 'integer',
			format: 'uint32',
		},
		posTokenID: {
			type: 'string',
			format: 'hex',
		},
		validatorRegistrationFee: {
			type: 'string',
			format: 'uint64',
		},
		maxBFTWeightCap: {
			type: 'integer',
			format: 'uint32',
			minimum: 1,
			maximum: 9999,
		},
		commissionIncreasePeriod: {
			type: 'integer',
			format: 'uint32',
		},
		maxCommissionIncreaseRate: {
			type: 'integer',
			format: 'uint32',
		},
		useInvalidBLSKey: {
			type: 'boolean',
		},
	},
	required: [
		'factorSelfStakes',
		'maxLengthName',
		'maxNumberSentStakes',
		'maxNumberPendingUnlocks',
		'failSafeMissedBlocks',
		'failSafeInactiveWindow',
		'punishmentWindow',
		'roundLength',
		'minWeightStandby',
		'numberActiveValidators',
		'numberStandbyValidators',
		'posTokenID',
		'validatorRegistrationFee',
		'maxBFTWeightCap',
		'useInvalidBLSKey',
	],
};

export const genesisStoreSchema = {
	$id: '/pos/module/genesis',
	type: 'object',
	required: ['validators', 'stakers', 'genesisData'],
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
					'reportMisbehaviorHeights',
					'consecutiveMissedBlocks',
					'commission',
					'lastCommissionIncreaseHeight',
					'sharingCoefficients',
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
					reportMisbehaviorHeights: {
						type: 'array',
						fieldNumber: 8,
						items: { dataType: 'uint32' },
					},
					consecutiveMissedBlocks: {
						dataType: 'uint32',
						fieldNumber: 9,
					},
					commission: {
						dataType: 'uint32',
						fieldNumber: 10,
						maximum: MAX_COMMISSION,
					},
					lastCommissionIncreaseHeight: {
						dataType: 'uint32',
						fieldNumber: 11,
					},
					sharingCoefficients: {
						type: 'array',
						fieldNumber: 12,
						items: {
							type: 'object',
							required: ['tokenID', 'coefficient'],
							properties: {
								tokenID: {
									dataType: 'bytes',
									minLength: TOKEN_ID_LENGTH,
									maxLength: TOKEN_ID_LENGTH,
									fieldNumber: 1,
								},
								coefficient: {
									dataType: 'bytes',
									maxLength: MAX_NUMBER_BYTES_Q96,
									fieldNumber: 2,
								},
							},
						},
					},
				},
			},
		},
		stakers: {
			type: 'array',
			fieldNumber: 2,
			items: {
				type: 'object',
				required: ['address', 'stakes', 'pendingUnlocks'],
				properties: {
					address: {
						dataType: 'bytes',
						format: 'lisk32',
						fieldNumber: 1,
					},
					stakes: {
						type: 'array',
						fieldNumber: 2,
						items: {
							type: 'object',
							required: ['validatorAddress', 'amount', 'sharingCoefficients'],
							properties: {
								validatorAddress: {
									dataType: 'bytes',
									format: 'lisk32',
									fieldNumber: 1,
								},
								amount: {
									dataType: 'uint64',
									fieldNumber: 2,
								},
								sharingCoefficients: {
									type: 'array',
									fieldNumber: 3,
									items: {
										type: 'object',
										required: ['tokenID', 'coefficient'],
										properties: {
											tokenID: {
												dataType: 'bytes',
												minLength: TOKEN_ID_LENGTH,
												maxLength: TOKEN_ID_LENGTH,
												fieldNumber: 1,
											},
											coefficient: {
												dataType: 'bytes',
												maxLength: MAX_NUMBER_BYTES_Q96,
												fieldNumber: 2,
											},
										},
									},
								},
							},
						},
					},
					pendingUnlocks: {
						type: 'array',
						fieldNumber: 3,
						items: {
							type: 'object',
							required: ['validatorAddress', 'amount', 'unstakeHeight'],
							properties: {
								validatorAddress: {
									dataType: 'bytes',
									fieldNumber: 1,
									format: 'lisk32',
								},
								amount: {
									dataType: 'uint64',
									fieldNumber: 2,
								},
								unstakeHeight: {
									dataType: 'uint32',
									fieldNumber: 3,
								},
							},
						},
					},
				},
			},
		},
		genesisData: {
			type: 'object',
			fieldNumber: 3,
			required: ['initRounds', 'initValidators'],
			properties: {
				initRounds: {
					dataType: 'uint32',
					fieldNumber: 1,
				},
				initValidators: {
					type: 'array',
					fieldNumber: 2,
					items: { dataType: 'bytes', format: 'lisk32' },
				},
			},
		},
	},
};

const validatorJSONSchema = {
	type: 'object',
	required: [
		'address',
		'name',
		'totalStakeReceived',
		'selfStake',
		'lastGeneratedHeight',
		'isBanned',
		'pomHeights',
		'punishmentPeriods',
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
		totalStakeReceived: {
			type: 'string',
			format: 'uint64',
		},
		selfStake: {
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
		punishmentPeriods: {
			type: 'array',
			items: {
				type: 'object',
				required: ['start', 'end'],
				properties: {
					start: {
						type: 'integer',
						format: 'uint32',
					},
					end: {
						type: 'integer',
						format: 'uint32',
					},
				},
			},
		},
		consecutiveMissedBlocks: {
			type: 'integer',
			format: 'uint32',
		},
	},
};

export const getValidatorRequestSchema = {
	$id: 'modules/pos/endpoint/getValidatorRequest',
	type: 'object',
	required: ['address'],
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
	},
};

export const getValidatorResponseSchema = {
	$id: 'modules/pos/endpoint/getValidatorResponse',
	...validatorJSONSchema,
};

export const getStakerRequestSchema = getValidatorRequestSchema;

export const getStakerResponseSchema = {
	$id: 'modules/pos/endpoint/getStakerResponse',
	type: 'object',
	required: ['stakes', 'pendingUnlocks'],
	properties: {
		stakes: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['validatorAddress', 'amount'],
				properties: {
					validatorAddress: {
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
				required: ['validatorAddress', 'amount', 'unstakeHeight'],
				properties: {
					validatorAddress: {
						type: 'string',
						format: 'lisk32',
					},
					amount: {
						type: 'string',
						format: 'uint64',
					},
					unstakeHeight: {
						type: 'integer',
						format: 'uint32',
					},
				},
			},
		},
	},
};

export const getAllValidatorsResponseSchema = {
	$id: 'modules/pos/endpoint/getAllValidatorsResponse',
	type: 'object',
	required: ['validators'],
	properties: {
		validators: {
			type: 'array',
			items: validatorJSONSchema,
		},
	},
};

export const getPoSTokenIDResponseSchema = {
	$id: 'modules/pos/endpoint/getPoSTokenIDResponse',
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
	$id: 'modules/pos/endpoint/getValidatorsByStakeRequest',
	type: 'object',
	properties: {
		limit: {
			type: 'integer',
			format: 'int32',
		},
	},
};

export const getValidatorsByStakeResponseSchema = {
	$id: 'modules/pos/endpoint/getValidatorsByStakeResponse',
	type: 'object',
	required: ['validators'],
	properties: {
		validators: {
			type: 'array',
			items: validatorJSONSchema,
		},
	},
};

export const getLockedRewardRequestSchema = {
	$id: 'modules/pos/endpoint/getLockedRewardRequest',
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

export const getLockedRewardResponseSchema = {
	$id: 'modules/pos/endpoint/getLockedRewardResponse',
	type: 'object',
	required: ['reward'],
	properties: {
		reward: {
			type: 'string',
			format: 'uint64',
		},
	},
};

export const getClaimableRewardsRequestSchema = {
	$id: 'modules/pos/endpoint/getClaimableRewardsRequest',
	type: 'object',
	required: ['address'],
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
	},
};

export const getClaimableRewardsResponseSchema = {
	$id: 'modules/pos/endpoint/getClaimableRewardsResponse',
	type: 'object',
	properties: {
		rewards: {
			items: {
				type: 'object',
				required: ['tokenID', 'reward'],
				properties: {
					tokenID: {
						type: 'string',
						format: 'hex',
					},
					reward: {
						type: 'string',
						format: 'uint64',
					},
				},
			},
		},
	},
};

export const getLockedStakedAmountRequestSchema = {
	$id: 'modules/pos/endpoint/getLockedStakedAmountRequest',
	type: 'object',
	required: ['address'],
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
	},
};

export const getLockedStakedAmountResponseSchema = {
	$id: 'modules/pos/endpoint/getLockedStakedAmountResponse',
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
	$id: 'modules/pos/endpoint/getPendingUnlocksRequest',
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
	$id: 'modules/pos/endpoint/getPendingUnlocksResponse',
	type: 'object',
	required: ['amount'],
	properties: {
		pendingUnlocks: {
			type: 'array',
			items: {
				type: 'object',
				required: [
					'validatorAddress',
					'amount',
					'unstakeHeight',
					'expectedUnlockableHeight',
					'unlockable',
				],
				properties: {
					validatorAddress: {
						type: 'string',
						format: 'lisk32',
					},
					amount: {
						type: 'string',
						format: 'uint64',
					},
					unstakeHeight: {
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

export const getRegistrationFeeResponseSchema = {
	$id: 'modules/pos/endpoint/getRegistrationFeeResponse',
	type: 'object',
	required: ['registrationFee'],
	properties: {
		registrationFee: {
			type: 'string',
		},
	},
};

export const getExpectedSharedRewardsRequestSchema = {
	$id: 'modules/pos/endpoint/getExpectedSharedRewardsRequest',
	type: 'object',
	required: ['validatorAddress', 'validatorReward', 'stake'],
	properties: {
		validatorAddress: {
			type: 'string',
			format: 'lisk32',
		},
		validatorReward: {
			type: 'string',
			format: 'uint64',
		},
		stake: {
			type: 'string',
			format: 'uint64',
		},
	},
};

export const getExpectedSharedRewardsResponseSchema = {
	$id: 'modules/pos/endpoint/getExpectedSharedRewardsResponse',
	type: 'object',
	required: ['reward'],
	properties: {
		reward: {
			type: 'string',
			format: 'uint64',
		},
	},
};
