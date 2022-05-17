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
export const blockSchema = {
	$id: '/block',
	type: 'object',
	properties: {
		header: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		transactions: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 2,
		},
		assets: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 3,
		},
	},
	required: ['header', 'transactions', 'assets'],
};

export const signingBlockHeaderSchema = {
	$id: '/block/header/signing/3',
	type: 'object',
	properties: {
		version: { dataType: 'uint32', fieldNumber: 1 },
		timestamp: { dataType: 'uint32', fieldNumber: 2 },
		height: { dataType: 'uint32', fieldNumber: 3 },
		previousBlockID: { dataType: 'bytes', fieldNumber: 4 },
		generatorAddress: { dataType: 'bytes', fieldNumber: 5 },
		transactionRoot: { dataType: 'bytes', fieldNumber: 6 },
		assetsRoot: { dataType: 'bytes', fieldNumber: 7 },
		eventRoot: { dataType: 'bytes', fieldNumber: 8 },
		stateRoot: { dataType: 'bytes', fieldNumber: 9 },
		maxHeightPrevoted: { dataType: 'uint32', fieldNumber: 10 },
		maxHeightGenerated: { dataType: 'uint32', fieldNumber: 11 },
		validatorsHash: { dataType: 'bytes', fieldNumber: 12 },
		aggregateCommit: {
			type: 'object',
			fieldNumber: 13,
			required: ['height', 'aggregationBits', 'certificateSignature'],
			properties: {
				height: {
					dataType: 'uint32',
					fieldNumber: 1,
				},
				aggregationBits: {
					dataType: 'bytes',
					fieldNumber: 2,
				},
				certificateSignature: {
					dataType: 'bytes',
					fieldNumber: 3,
				},
			},
		},
	},
	required: [
		'version',
		'timestamp',
		'height',
		'previousBlockID',
		'generatorAddress',
		'transactionRoot',
		'assetsRoot',
		'eventRoot',
		'stateRoot',
		'maxHeightPrevoted',
		'maxHeightGenerated',
		'validatorsHash',
		'aggregateCommit',
	],
};

export const blockHeaderSchema = {
	...signingBlockHeaderSchema,
	$id: '/block/header/3',
	required: [...signingBlockHeaderSchema.required, 'signature'],
	properties: {
		...signingBlockHeaderSchema.properties,
		signature: { dataType: 'bytes', fieldNumber: 14 },
	},
};

export const blockHeaderSchemaWithId = {
	...blockHeaderSchema,
	$id: '/block/header/3',
	required: [...blockHeaderSchema.required, 'id'],
	properties: {
		...blockHeaderSchema.properties,
		id: { dataType: 'bytes', fieldNumber: 15 },
	},
};

export const blockAssetSchema = {
	$id: '/block/asset/3',
	type: 'object',
	required: ['moduleID', 'data'],
	properties: {
		moduleID: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		data: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
	},
};

export const stateDiffSchema = {
	$id: '/state/diff',
	type: 'object',
	required: ['updated', 'created'],
	properties: {
		updated: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				properties: {
					key: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					value: {
						dataType: 'bytes',
						fieldNumber: 2,
					},
				},
			},
		},
		created: {
			type: 'array',
			fieldNumber: 2,
			items: {
				dataType: 'bytes',
			},
		},
		deleted: {
			type: 'array',
			fieldNumber: 3,
			items: {
				type: 'object',
				properties: {
					key: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					value: {
						dataType: 'bytes',
						fieldNumber: 2,
					},
				},
			},
		},
	},
};

export const eventSchema = {
	$id: '/block/event',
	type: 'object',
	required: ['moduleID', 'typeID', 'data', 'topics', 'index'],
	properties: {
		moduleID: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		typeID: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		data: {
			dataType: 'bytes',
			fieldNumber: 3,
		},
		topics: {
			type: 'array',
			fieldNumber: 4,
			items: {
				maxItems: 4,
				dataType: 'bytes',
			},
		},
		index: {
			dataType: 'uint32',
			fieldNumber: 5,
		},
	},
};

export const standardEventDataSchema = {
	$id: '/block/event/standard',
	type: 'object',
	required: ['success'],
	properties: {
		success: {
			dataType: 'boolean',
			fieldNumber: 1,
		},
	},
};
