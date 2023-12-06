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

import { chain, aggregateCommitSchema, ccmSchema } from 'lisk-sdk';
import {
	CCU_FREQUENCY,
	CCU_TOTAL_CCM_SIZE,
	DEFAULT_CCU_SAVE_LIMIT,
	DEFAULT_REGISTRATION_HEIGHT,
} from './constants';

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
			description: 'Encrypted privateKey of the relayer',
		},
		ccuFee: {
			type: 'string',
			format: 'uint64',
			description: 'Fee to be paid for each CCU transaction',
		},
		isSaveCCU: {
			type: 'boolean',
			description:
				'Flag for the user to either save or send a CCU on creation. Send is by default.',
		},
		maxCCUSize: {
			type: 'integer',
			description: 'Maximum size of CCU to be allowed',
			minimum: 1,
			maximum: CCU_TOTAL_CCM_SIZE,
		},
		ccuSaveLimit: {
			type: 'integer',
			description: 'Number of CCUs to save.',
			minimum: -1,
		},
		registrationHeight: {
			type: 'integer',
			description: 'Height at the time of registration on the receiving chain.',
			minimum: 1,
		},
		receivingChainID: {
			type: 'string',
			description: 'Chain ID of the receiving chain.',
		},
	},
	required: ['encryptedPrivateKey', 'receivingChainID'],
	default: {
		ccuFrequency: CCU_FREQUENCY,
		isSaveCCU: false,
		ccuFee: '0',
		maxCCUSize: CCU_TOTAL_CCM_SIZE,
		registrationHeight: DEFAULT_REGISTRATION_HEIGHT,
		ccuSaveLimit: DEFAULT_CCU_SAVE_LIMIT,
	},
};

export const validatorsDataSchema = {
	$id: `${pluginSchemaIDPrefix}/validatorsData`,
	type: 'object',
	required: ['validators', 'certificateThreshold', 'validatorsHash'],
	properties: {
		validators: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['address', 'blsKey', 'bftWeight'],
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
	required: [...ccmSchema.required, 'height'],
	properties: {
		...ccmSchema.properties,
		height: { dataType: 'uint32', fieldNumber: Object.keys(ccmSchema.properties).length + 1 },
	},
};

export const listOfCCUsSchema = {
	$id: `${pluginSchemaIDPrefix}/listOfCCUs`,
	type: 'object',
	properties: {
		listOfCCUs: {
			type: 'array',
			fieldNumber: 1,
			items: {
				...chain.transactionSchema,
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
				required: ['ccms', 'height', 'inclusionProof', 'outboxSize'],
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
						required: ['siblingHashes', 'bitmap'],
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
					outboxSize: {
						dataType: 'uint32',
						fieldNumber: 4,
					},
				},
			},
		},
	},
};

export const authorizeRequestSchema = {
	$id: '/lisk/chainConnector/authorizeRequest',
	type: 'object',
	required: ['password', 'enable'],
	properties: {
		password: {
			type: 'string',
		},
		enable: {
			type: 'boolean',
		},
	},
};
