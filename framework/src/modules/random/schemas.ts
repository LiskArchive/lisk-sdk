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

export interface Address {
	address: string;
}

export interface SetSeedRequest extends Address {
	seed?: string | undefined;
	count?: number | undefined;
	distance?: number | undefined;
}

export const setSeedRequestSchema = {
	$id: 'lisk/random/setSeedRequestSchema',
	type: 'object',
	title: 'Random setSeed request',
	required: ['address'],
	properties: {
		address: {
			type: 'string',
			format: 'hex',
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

export const setSeedSchema = {
	$id: 'lisk/random/setSeedSchema',
	type: 'object',
	required: [],
	properties: {
		count: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		distance: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		hashes: {
			type: 'array',
			fieldNumber: 3,
			items: {
				dataType: 'bytes',
			},
		},
	},
};

interface Seeds extends Address {
	seed: string;
	count: number;
	distance: number;
}

export interface GetSeedsResponse {
	seeds: Seeds[];
}

export interface HasSeedResponse {
	hasSeed: boolean;
	remaining: number;
}

export const hasSeedSchema = {
	$id: 'lisk/random/hasSeedSchema',
	type: 'object',
	required: [],
	properties: {
		hasSeed: {
			dataType: 'boolean',
			fieldNumber: 1,
		},
		remaining: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
	},
};

export interface GetSeedUsageResponse {
	height: number;
	count: number;
	lastUsedHash: string;
	seed: string;
}

export const getSeedUsageSchema = {
	$id: 'lisk/random/getSeedUsageSchema',
	type: 'object',
	required: [],
	properties: {
		height: {
			type: 'integer',
			// dataType: 'uint32',
			fieldNumber: 1,
		},
		count: {
			type: 'integer',
			// dataType: 'uint32',
			fieldNumber: 2,
		},
		lastUsedHash: {
			type: 'string',
			format: 'hex',
			// dataType: 'bytes',
			fieldNumber: 3,
		},
		seed: {
			type: 'string',
			format: 'hex',
			// dataType: 'bytes',
			fieldNumber: 4,
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
						format: 'hex',
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
			format: 'hex',
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
