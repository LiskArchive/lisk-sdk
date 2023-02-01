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

import { chain, aggregateCommitSchema, ccmSchema, certificateSchema } from 'lisk-sdk';
import { CCU_FREQUENCY } from './constants';

const pluginSchemaIDPrefix = '/lisk/plugins/chainConnector';

export const configSchema = {
	$id: `${pluginSchemaIDPrefix}/config`,
	type: 'object',
	properties: {
		receivingChainIPCPath: {
			type: 'string',
			description: 'The IPC path of a receiving node',
		},
		receivingChainWsURL: {
			type: 'string',
			description: 'The WS url of a receiving node',
		},
		ccuFrequency: {
			type: 'integer',
			description: 'Number of blocks after which a CCU should be created',
		},
		encryptedPrivateKey: {
			type: 'string',
		},
		ccuFee: {
			type: 'string',
			format: 'uint64',
		},
		password: {
			type: 'string',
		},
	},
	required: ['ccuFee', 'encryptedPrivateKey', 'password'],
	default: {
		ccuFrequency: CCU_FREQUENCY,
	},
};

export const validatorsDataSchema = {
	$id: `${pluginSchemaIDPrefix}/validatorsData`,
	type: 'object',
	required: ['validators', 'certificateThreshold'],
	properties: {
		validators: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['blsKey', 'bftWeight'],
				properties: {
					address: { dataType: 'bytes', fieldNumber: 1 },
					blsKey: { dataType: 'bytes', fieldNumber: 2 },
					bftWeight: { dataType: 'uint64', fieldNumber: 3 },
				},
			},
		},
		certificateThreshold: { dataType: 'uint64', fieldNumber: 2 },
		validatorsHash: { dataType: 'bytes', fieldNumber: 3 },
	},
};

export const blockHeadersInfoSchema = {
	$id: `${pluginSchemaIDPrefix}/blockHeaders`,
	type: 'object',
	properties: {
		blockHeaders: {
			type: 'array',
			fieldNumber: 1,
			items: {
				...chain.blockHeaderSchema,
			},
		},
	},
};

export const aggregateCommitsInfoSchema = {
	$id: `${pluginSchemaIDPrefix}/aggregateCommits`,
	type: 'object',
	properties: {
		aggregateCommits: {
			type: 'array',
			fieldNumber: 1,
			items: {
				...aggregateCommitSchema,
			},
		},
	},
};

export const validatorsHashPreimageInfoSchema = {
	$id: `${pluginSchemaIDPrefix}/validatorsHashPreimage`,
	type: 'object',
	properties: {
		validatorsHashPreimage: {
			type: 'array',
			fieldNumber: 1,
			items: {
				...validatorsDataSchema,
			},
		},
	},
};

export const lastSentCCMWithHeight = {
	$id: `${pluginSchemaIDPrefix}/lastSentCCMWithHeight`,
	type: 'object',
	properties: {
		...ccmSchema.properties,
		height: { dataType: 'uint32', fieldNumber: Object.keys(ccmSchema.properties).length },
	},
};

export const certifcatesSchema = {
	$id: `${pluginSchemaIDPrefix}/certifcates`,
	type: 'object',
	properties: {
		type: 'array',
		fieldNumber: 1,
		items: {
			type: 'object',
			properties: {
				...certificateSchema.properties,
			},
		},
	},
};

export const ccmsFromEventsSchema = {
	$id: `${pluginSchemaIDPrefix}/ccmsFromEvents`,
	type: 'object',
	properties: {
		ccmsFromEvents: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				properties: {
					ccms: {
						type: 'array',
						fieldNumber: 1,
						items: {
							...ccmSchema,
						},
					},
					height: { dataType: 'uint32', fieldNumber: 2 },
					inclusionProof: {
						type: 'object',
						fieldNumber: 3,
						properties: {
							siblingHashes: {
								type: 'array',
								fieldNumber: 1,
								items: {
									dataType: 'bytes',
								},
							},
							bitmap: {
								dataType: 'bytes',
								fieldNumber: 2,
							},
						},
					},
				},
			},
		},
	},
};
