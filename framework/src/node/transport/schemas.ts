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

export const schemas = {
	getBlocksFromIdRequest: {
		id: 'getBlocksFromIdRequest',
		type: 'object',
		required: ['blockId'],
		properties: {
			blockId: {
				type: 'object',
				format: 'bytes',
			},
		},
	},
	getTransactionsRequest: {
		id: 'getTransactionsRequest',
		type: 'object',
		properties: {
			transactionIds: {
				type: 'array',
				items: {
					type: 'object',
					format: 'bytes',
				},
			},
		},
	},
	postBlockEvent: {
		id: 'postBlockEvent',
		type: 'object',
		required: ['block'],
		properties: {
			block: {
				type: 'object',
				format: 'bytes',
			},
		},
	},
	postTransactionsAnnouncementEvent: {
		id: 'postTransactionsAnnouncementEvent',
		type: 'object',
		required: ['transactionIds'],
		properties: {
			transactionIds: {
				type: 'array',
				items: {
					type: 'object',
					format: 'bytes',
				},
				minItems: 1,
				maxItems: 100,
			},
		},
	},
	getHighestCommonBlockRequest: {
		id: 'getHighestCommonBlockRequest',
		type: 'object',
		required: ['ids'],
		properties: {
			ids: {
				type: 'array',
				items: {
					type: 'object',
					format: 'bytes',
				},
				uniqueItems: true,
				minItems: 1,
			},
		},
	},
};

export const getBlocksFromIdRequestSchema = {
	$id: 'lisk/getBlocksFromIdRequest',
	title: 'Get Blocks From Id Request',
	type: 'object',
	required: ['blockId'],
	properties: {
		ids: {
			type: 'array',
			fieldNumber: 1,
			dataType: 'bytes',
		},
	},
};

export const getHighestCommonBlockRequestSchema = {
	$id: 'lisk/getHighestCommonBlockRequest',
	title: 'Get Highest Common Block Request',
	type: 'object',
	required: ['ids'],
	properties: {
		ids: {
			type: 'array',
			fieldNumber: 1,
			items: {
				dataType: 'bytes',
			},
		},
	},
};

export const transactionIdsSchema = {
	$id: 'lisk/transactionIds',
	title: 'Broadcast Transactions',
	type: 'object',
	required: ['transactionIds'],
	properties: {
		transactionIds: {
			type: 'array',
			fieldNumber: 1,
			items: {
				dataType: 'bytes',
			},
		},
	},
};

export const postBlockEventSchema = {
	$id: 'lisk/postBlockEvent',
	title: 'Post Block Event',
	type: 'object',
	required: ['block'],
	properties: {
		block: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
	},
};
