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
		payload: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 2,
		},
	},
	required: ['header', 'payload'],
};

export const signingBlockHeaderSchema = {
	$id: '/block/header/signing/2',
	type: 'object',
	properties: {
		version: { dataType: 'uint32', fieldNumber: 1 },
		timestamp: { dataType: 'uint32', fieldNumber: 2 },
		height: { dataType: 'uint32', fieldNumber: 3 },
		previousBlockID: { dataType: 'bytes', fieldNumber: 4 },
		stateRoot: { dataType: 'bytes', fieldNumber: 5 },
		transactionRoot: { dataType: 'bytes', fieldNumber: 6 },
		generatorAddress: { dataType: 'bytes', fieldNumber: 7 },
		assets: {
			type: 'array',
			fieldNumber: 8,
			items: {
				type: 'object',
				required: ['moduleID', 'data'],
				properties: {
					moduleID: { dataType: 'uint32', fieldNumber: 1 },
					data: { dataType: 'bytes', fieldNumber: 2 },
				},
			},
		},
	},
	required: [
		'version',
		'timestamp',
		'height',
		'previousBlockID',
		'stateRoot',
		'transactionRoot',
		'generatorAddress',
		'assets',
	],
};

export const blockHeaderSchema = {
	...signingBlockHeaderSchema,
	$id: '/block/header/2',
	required: [...signingBlockHeaderSchema.required, 'signature'],
	properties: {
		...signingBlockHeaderSchema.properties,
		signature: { dataType: 'bytes', fieldNumber: 9 },
	},
};

export const blockHeaderSchemaWithId = {
	...blockHeaderSchema,
	$id: '/block/header/2',
	required: [...blockHeaderSchema.required, 'id'],
	properties: {
		...blockHeaderSchema.properties,
		id: { dataType: 'bytes', fieldNumber: 10 },
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
