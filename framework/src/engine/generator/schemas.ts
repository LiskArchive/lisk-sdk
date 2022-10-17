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

import { EventJSON, JSONObject } from '../../types';
import { GeneratorKeys } from './types';

export const transactionIdsSchema = {
	$id: '/lisk/transactionIds',
	title: 'Broadcast Transactions',
	type: 'object',
	required: ['transactionIds'],
	properties: {
		transactionIds: {
			type: 'array',
			fieldNumber: 1,
			minItems: 1,
			maxItems: 100,
			items: {
				dataType: 'bytes',
			},
		},
	},
};

export interface SetStatusRequest {
	address: string;
	height: number;
	maxHeightPrevoted: number;
	maxHeightGenerated: number;
}

export const setStatusRequestSchema = {
	$id: '/lisk/setStatusRequest',
	title: 'Set block generation status',
	type: 'object',
	required: ['address', 'height', 'maxHeightPreviouslyForged', 'maxHeightPrevoted'],
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
		height: {
			type: 'integer',
			minimum: 0,
		},
		maxHeightPreviouslyForged: {
			type: 'integer',
			minimum: 0,
		},
		maxHeightPrevoted: {
			type: 'integer',
			minimum: 0,
		},
	},
};

export interface UpdateStatusRequest {
	address: string;
	enable: boolean;
	password: string;
	height: number;
	maxHeightPrevoted: number;
	maxHeightGenerated: number;
}

export interface UpdateStatusResponse {
	address: string;
	enabled: boolean;
}

export interface GetStatusResponse {
	status: {
		address: string;
		height: number;
		maxHeightPrevoted: number;
		maxHeightGenerated: number;
		enabled: boolean;
	}[];
}

export const updateStatusRequestSchema = {
	$id: '/lisk/updateStatusRequest',
	title: 'Update block generation status',
	type: 'object',
	required: ['address', 'password', 'enable', 'height', 'maxHeightGenerated', 'maxHeightPrevoted'],
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
		password: {
			type: 'string',
		},
		enable: {
			type: 'boolean',
		},
		height: {
			type: 'integer',
		},
		maxHeightGenerated: {
			type: 'integer',
		},
		maxHeightPrevoted: {
			type: 'integer',
		},
	},
};

export interface EstimateSafeStatusRequest {
	timeShutdown: number;
}

export const estimateSafeStatusRequestSchema = {
	$id: '/generator/estimateSafeStatusRequest',
	type: 'object',
	required: ['timeShutdown'],
	properties: {
		timeShutdown: {
			type: 'integer',
		},
	},
};

export interface EstimateSafeStatusResponse {
	height: number;
	maxHeightPrevoted: number;
	maxHeightGenerated: number;
}

export interface PostTransactionRequest {
	transaction: string;
}

export interface PostTransactionResponse {
	transactionId: string;
}

export const postTransactionRequestSchema = {
	$id: '/lisk/postTransaction',
	title: 'Transactions',
	type: 'object',
	required: ['transaction'],
	properties: {
		transaction: {
			type: 'string',
			format: 'hex',
		},
	},
};

export const getTransactionRequestSchema = {
	$id: '/lisk/getTransactionRequest',
	title: 'Broadcast Transactions',
	type: 'object',
	required: ['transactionIds'],
	properties: {
		transactionIds: {
			type: 'array',
			fieldNumber: 1,
			minItems: 1,
			maxItems: 100,
			items: {
				dataType: 'bytes',
			},
		},
	},
};

export interface GetTransactionRequest {
	transactionIds: Buffer[];
}

export const getTransactionsResponseSchema = {
	$id: '/lisk/getTransactionsResponse',
	title: 'Transactions',
	type: 'object',
	required: ['transactions'],
	properties: {
		transactions: {
			type: 'array',
			fieldNumber: 1,
			items: {
				dataType: 'bytes',
			},
		},
	},
};

export interface GetTransactionResponse {
	transactions: Buffer[];
}

export const postTransactionsAnnouncementSchema = {
	$id: '/lisk/postTransactionsAnnouncementSchema',
	title: 'Post Transactions Announcement',
	type: 'object',
	required: ['transactionIds'],
	properties: {
		transactionIds: {
			type: 'array',
			fieldNumber: 1,
			minItems: 1,
			maxItems: 100,
			items: {
				dataType: 'bytes',
			},
		},
	},
};

export interface PostTransactionsAnnouncement {
	transactionIds: Buffer[];
}

export interface GeneratedInfo {
	height: number;
	maxHeightPrevoted: number;
	maxHeightGenerated: number;
}

export const previouslyGeneratedInfoSchema = {
	title: 'Previously Generated Info',
	$id: '/node/generator/previously_generated_info',
	type: 'object',
	required: ['height', 'maxHeightPrevoted', 'maxHeightGenerated'],
	properties: {
		height: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		maxHeightPrevoted: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		maxHeightGenerated: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};

export interface DryRunTransactionRequest {
	transaction: string;
}

export interface DryRunTransactionResponse {
	success: boolean;
	events: EventJSON[];
}

export const dryRunTransactionRequestSchema = {
	$id: '/lisk/dryRunTransaction',
	title: 'Transactions',
	type: 'object',
	required: ['transaction'],
	properties: {
		transaction: {
			type: 'string',
			format: 'hex',
		},
	},
};

export const generatorKeysSchema = {
	$id: '/generator/generatorKeysSchema',
	type: 'object',
	properties: {
		type: {
			dataType: 'string',
			fieldNumber: 1,
		},
		data: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
	},
};

export const plainGeneratorKeysSchema = {
	$id: '/generator/plainGeneratorKeys',
	type: 'object',
	properties: {
		generatorKey: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		generatorPrivateKey: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		blsKey: {
			dataType: 'bytes',
			fieldNumber: 3,
		},
		blsPrivateKey: {
			dataType: 'bytes',
			fieldNumber: 4,
		},
	},
};

export const encryptedMessageSchema = {
	$id: '/generator/encryptedMessage',
	type: 'object',
	properties: {
		version: {
			dataType: 'string',
			fieldNumber: 1,
		},
		ciphertext: {
			dataType: 'string',
			fieldNumber: 2,
		},
		kdf: {
			dataType: 'string',
			fieldNumber: 3,
		},
		kdfparams: {
			type: 'object',
			fieldNumber: 4,
			properties: {
				parallelism: {
					dataType: 'uint32',
					fieldNumber: 1,
				},
				iterations: {
					dataType: 'uint32',
					fieldNumber: 2,
				},
				memorySize: {
					dataType: 'uint32',
					fieldNumber: 3,
				},
				salt: {
					dataType: 'string',
					fieldNumber: 4,
				},
			},
		},
		cipher: {
			dataType: 'string',
			fieldNumber: 5,
		},
		cipherparams: {
			type: 'object',
			fieldNumber: 6,
			properties: {
				iv: {
					dataType: 'string',
					fieldNumber: 1,
				},
				tag: {
					dataType: 'string',
					fieldNumber: 2,
				},
			},
		},
	},
};

export type SetKeysRequest = JSONObject<GeneratorKeys> & {
	address: string;
};

const encryptedObjectSchema = {
	type: 'object',
	required: ['version', 'ciphertext', 'kdf', 'kdfparams', 'cipher', 'cipherparams'],
	properties: {
		version: {
			type: 'string',
		},
		ciphertext: {
			type: 'string',
			format: 'hex',
		},
		kdf: {
			type: 'string',
			enum: ['argon2id', 'PBKDF2'],
		},
		kdfparams: {
			type: 'object',
			properties: {
				parallelism: {
					type: 'integer',
				},
				iterations: {
					type: 'integer',
				},
				memoriSize: {
					type: 'integer',
				},
				salt: {
					type: 'string',
					format: 'hex',
				},
			},
		},
		cipher: {
			type: 'string',
			enum: ['aes-256-gcm'],
		},
		cipherparams: {
			type: 'object',
			properties: {
				iv: {
					type: 'string',
					format: 'hex',
				},
				tag: {
					type: 'string',
					format: 'hex',
				},
			},
		},
	},
};

const plainKeysObjectSchema = {
	type: 'object',
	required: ['generatorKey', 'generatorPrivateKey', 'blsKey', 'blsPrivateKey'],
	properties: {
		generatorKey: {
			type: 'string',
			format: 'hex',
			minLength: 64,
			maxLength: 64,
		},
		generatorPrivateKey: {
			type: 'string',
			format: 'hex',
			minLength: 128,
			maxLength: 128,
		},
		blsKey: {
			type: 'string',
			format: 'hex',
			minLength: 96,
			maxLength: 96,
		},
		blsPrivateKey: {
			type: 'string',
			format: 'hex',
			minLength: 64,
			maxLength: 64,
		},
	},
};

export const setKeysRequestSchema = {
	$id: '/generator/setKeysRequest',
	type: 'object',
	required: ['address', 'type', 'data'],
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
	},
	oneOf: [
		{
			type: 'object',
			properties: {
				type: {
					const: 'plain',
				},
				data: plainKeysObjectSchema,
			},
		},
		{
			type: 'object',
			properties: {
				type: {
					const: 'encrypted',
				},
				data: encryptedObjectSchema,
			},
		},
	],
};

export type HasKeysRequest = {
	address: string;
};

export const hasKeysRequestSchema = {
	$id: '/generator/hasKeysRequest',
	type: 'object',
	required: ['address'],
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
	},
};

export const keysFileSchema = {
	$id: '/generator/keysFile',
	type: 'object',
	required: ['keys'],
	properties: {
		keys: {
			type: 'array',
			items: {
				required: ['address'],
				properties: {
					address: {
						type: 'string',
						format: 'lisk32',
					},
					plain: plainKeysObjectSchema,
					encrypted: {
						...encryptedObjectSchema,
						// encrypted property can be empty object
						required: [],
					},
				},
			},
		},
	},
};
