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

import { ADDRESS_LENGTH, SEED_LENGTH } from './constants';
import { UsedHashOnion } from './stores/used_hash_onions';

interface AddressRequest {
	address: string;
}

export interface SetHashOnionRequest extends AddressRequest {
	seed?: string | undefined;
	count?: number | undefined;
	distance?: number | undefined;
}

export const hashOnionSchema = {
	$id: 'lisk/random/setSeedRequestSchema',
	type: 'object',
	title: 'Random setSeed request',
	required: ['address'],
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
		seed: {
			type: 'string',
			format: 'hex',
		},
		count: {
			type: 'integer',
			minimum: 1,
		},
		distance: {
			type: 'integer',
			minimum: 1,
		},
	},
};

interface Seeds extends AddressRequest {
	seed: string;
	count: number;
	distance: number;
}

export interface GetSeedsResponse {
	seeds: Seeds[];
}

export type HasHashOnionRequest = AddressRequest;

export interface HasHashOnionResponse {
	hasSeed: boolean;
	remaining: number;
}

export const addressSchema = {
	$id: 'lisk/random/addressSchema',
	type: 'object',
	required: ['address'],
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
	},
};

export const hasHashOnionResponseSchema = {
	$id: 'lisk/random/hasHashOnionResponseSchema',
	type: 'object',
	required: ['hasSeed', 'remaining'],
	properties: {
		hasSeed: {
			type: 'boolean',
		},
		remaining: {
			type: 'integer',
			format: 'uint32',
		},
	},
};

export interface GetHashOnionUsageResponse {
	readonly usedHashOnions: UsedHashOnion[];
	seed: string;
}

export type GetHashOnionUsageRequest = AddressRequest;

export const getHashOnionUsageResponse = {
	$id: 'lisk/random/getHashOnionUsageResponse',
	type: 'object',
	required: ['usedHashOnions', 'seed'],
	properties: {
		usedHashOnions: {
			type: 'array',
			items: {
				type: 'object',
				required: ['count', 'height'],
				properties: {
					count: {
						type: 'integer',
						format: 'uint32',
					},
					height: {
						type: 'integer',
						format: 'uint32',
					},
				},
			},
		},
		seed: {
			type: 'string',
			format: 'hex',
		},
	},
};

export interface SetHashOnionUsageRequest extends AddressRequest {
	usedHashOnions: UsedHashOnion[];
}

export const setHashOnionUsageRequest = {
	$id: 'lisk/random/setHashOnionUsageRequest',
	type: 'object',
	required: ['address', 'usedHashOnions'],
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
		usedHashOnions: {
			type: 'array',
			items: {
				type: 'object',
				required: ['count', 'height'],
				properties: {
					count: {
						type: 'integer',
						format: 'uint32',
					},
					height: {
						type: 'integer',
						format: 'uint32',
					},
				},
			},
		},
	},
};

export const randomModuleConfig = {
	$id: '/modules/random/config',
	type: 'object',
	required: ['maxLengthReveals'],
	properties: {
		maxLengthReveals: {
			type: 'integer',
			format: 'uint32',
		},
	},
};

export const randomModuleGeneratorConfig = {
	$id: '/modules/random/generator',
	type: 'object',
	required: [],
	properties: {
		hashOnions: {
			type: 'array',
			required: ['address', 'hashOnion'],
			items: {
				properties: {
					address: {
						type: 'string',
						format: 'lisk32',
					},
					hashOnion: {
						type: 'object',
						required: ['count', 'distance', 'hashes'],
						properties: {
							count: { type: 'integer' },
							distance: { type: 'integer' },
							hashes: {
								type: 'array',
								items: {
									type: 'string',
									format: 'hex',
								},
							},
						},
					},
				},
			},
		},
	},
};

export const seedRevealSchema = {
	$id: '/modules/random/seedReveal',
	type: 'object',
	required: ['validatorReveals'],
	properties: {
		validatorReveals: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['generatorAddress', 'seedReveal', 'height', 'valid'],
				properties: {
					generatorAddress: {
						dataType: 'bytes',
						minLength: ADDRESS_LENGTH,
						maxLength: ADDRESS_LENGTH,
						fieldNumber: 1,
					},
					seedReveal: {
						dataType: 'bytes',
						minLength: SEED_LENGTH,
						maxLength: SEED_LENGTH,
						fieldNumber: 2,
					},
					height: {
						dataType: 'uint32',
						fieldNumber: 3,
					},
					valid: {
						dataType: 'boolean',
						fieldNumber: 4,
					},
				},
			},
		},
	},
};

export const blockHeaderAssetRandomModule = {
	$id: '/modules/random/block/header/asset',
	type: 'object',
	properties: {
		seedReveal: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: SEED_LENGTH,
			maxLength: SEED_LENGTH,
		},
	},
	required: ['seedReveal'],
};

export const registeredHashOnionsStoreSchema = {
	title: 'Used hash onion',
	$id: '/forger/registeredHashOnion',
	type: 'object',
	required: ['registeredHashOnions'],
	properties: {
		registeredHashOnions: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['address', 'seedHash'],
				properties: {
					address: {
						dataType: 'bytes',
						format: 'lisk32',
						fieldNumber: 1,
					},
					seedHash: {
						dataType: 'bytes',
						fieldNumber: 2,
					},
				},
			},
		},
	},
};

export const usedHashOnionsStoreSchema = {
	title: 'Used hash onion',
	$id: '/node/forger/usedHashOnion',
	type: 'object',
	required: ['usedHashOnions'],
	properties: {
		usedHashOnions: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['address', 'count', 'height'],
				properties: {
					address: {
						dataType: 'bytes',
						fieldNumber: 1,
						format: 'lisk32',
					},
					count: {
						dataType: 'uint32',
						fieldNumber: 2,
					},
					height: {
						dataType: 'uint32',
						fieldNumber: 3,
					},
				},
			},
		},
	},
};

export const isSeedRevealValidRequestSchema = {
	$id: '/modules/random/endpoint/isSeedRevealRequest',
	type: 'object',
	required: ['generatorAddress', 'seedReveal'],
	properties: {
		generatorAddress: {
			type: 'string',
			format: 'lisk32',
		},
		seedReveal: {
			type: 'string',
			format: 'hex',
		},
	},
};

export const isSeedRevealValidResponseSchema = {
	$id: '/modules/random/endpoint/isSeedRevealRequest',
	type: 'object',
	required: ['valid'],
	properties: {
		valid: {
			type: 'boolean',
		},
	},
};
