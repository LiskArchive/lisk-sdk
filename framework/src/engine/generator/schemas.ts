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

export interface UpdateStatusRequest {
	address: string;
	enable: boolean;
	password: string;
	height: number;
	maxHeightPrevoted: number;
	maxHeightGenerated: number;
	overwrite?: boolean;
}

export interface UpdateStatusResponse {
	address: string;
	enabled: boolean;
}

export type GetStatusResponse = {
	address: string;
	enabled: boolean;
}[];

export const updateStatusRequestSchema = {
	$id: '/lisk/updateStatusRequest',
	title: 'Update block generation status',
	type: 'object',
	required: ['address', 'password', 'enable', 'height', 'maxHeightGenerated', 'maxHeightPrevoted'],
	properties: {
		address: {
			type: 'string',
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
		overwrite: {
			type: 'boolean',
		},
	},
};

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
