/*
 * Copyright © 2022 Lisk Foundation
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

export const channelSchema = {
	$id: 'modules/interoperability/channel',
	type: 'object',
	required: ['inbox', 'outbox', 'partnerChainOutboxRoot', 'messageFeeTokenID'],
	properties: {
		inbox: {
			type: 'object',
			fieldNumber: 1,
			required: ['appendPath', 'size', 'root'],
			properties: {
				appendPath: {
					type: 'array',
					items: {
						dataType: 'bytes',
					},
					fieldNumber: 1,
				},
				size: {
					dataType: 'uint32',
					fieldNumber: 2,
				},
				root: {
					dataType: 'bytes',
					fieldNumber: 3,
				},
			},
		},
		outbox: {
			type: 'object',
			fieldNumber: 2,
			required: ['appendPath', 'size', 'root'],
			properties: {
				appendPath: {
					type: 'array',
					items: {
						dataType: 'bytes',
					},
					fieldNumber: 1,
				},
				size: {
					dataType: 'uint32',
					fieldNumber: 2,
				},
				root: {
					dataType: 'bytes',
					fieldNumber: 3,
				},
			},
		},
		partnerChainOutboxRoot: {
			dataType: 'bytes',
			fieldNumber: 3,
		},
		messageFeeTokenID: {
			type: 'object',
			fieldNumber: 4,
			required: ['chainID', 'localID'],
			properties: {
				chainID: {
					dataType: 'uint32',
					fieldNumber: 1,
				},
				localID: {
					dataType: 'uint32',
					fieldNumber: 2,
				},
			},
		},
	},
};

export const outboxRootSchema = {
	$id: 'modules/interoperability/outbox',
	type: 'object',
	required: ['root'],
	properties: {
		root: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
	},
};

export const ccmSchema = {
	$id: 'modules/interoperability/ccm',
	type: 'object',
	required: [
		'nonce',
		'moduleID',
		'crossChainCommandID',
		'sendingChainID',
		'receivingChainID',
		'fee',
		'status',
		'params',
	],
	properties: {
		nonce: {
			dataType: 'uint64',
			fieldNumber: 1,
		},
		moduleID: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		crossChainCommandID: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		sendingChainID: {
			dataType: 'uint32',
			fieldNumber: 4,
		},
		receivingChainID: {
			dataType: 'uint32',
			fieldNumber: 5,
		},
		fee: {
			dataType: 'uint64',
			fieldNumber: 6,
		},
		status: {
			dataType: 'uint32',
			fieldNumber: 7,
		},
		params: {
			dataType: 'bytes',
			fieldNumber: 8,
		},
	},
};
