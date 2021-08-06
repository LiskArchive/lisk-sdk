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
	$id: 'lisk/transactionIds',
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

export interface UpdateForgingStatusRequest {
	address: string;
	enable: boolean;
	password: string;
	height: number;
	maxHeightPrevoted: number;
	maxHeightPreviouslyForged: number;
	overwrite?: boolean;
}

export interface UpdateForgingStatusResponse {
	address: string;
	enabled: boolean;
}

export type GetForgingStatusResponse = {
	address: string;
	enabled: boolean;
}[];

export const updateForgingStatusRequestSchema = {
	$id: 'lisk/updateForgingStatusRequest',
	title: 'Update forging status',
	type: 'object',
	required: [
		'address',
		'password',
		'enable',
		'height',
		'maxHeightPreviouslyForged',
		'maxHeightPrevoted',
	],
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
		maxHeightPreviouslyForged: {
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
	$id: 'lisk/postTransaction',
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
	$id: 'lisk/getTransactionRequest',
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
	$id: 'lisk/getTransactionsResponse',
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
	$id: 'lisk/postTransactionsAnnouncementSchema',
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
