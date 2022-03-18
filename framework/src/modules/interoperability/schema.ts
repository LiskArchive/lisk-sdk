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

export const chainAccountSchema = {
	$id: 'modules/interoperability/chainAccount',
	type: 'object',
	required: [
		'inbox',
		'outbox',
		'networkID',
		'lastCertifiedStateRoot',
		'lastCertifiedTimestamp',
		'lastCertifiedHeight',
		'partnerChainOutboxRoot',
		'partnerChainOutboxSize',
		'partnerChainInboxSize',
		'name',
		'status',
		'activeValidators',
		'certificateThreshold',
	],
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
					dataType: 'uint64',
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
					dataType: 'uint64',
					fieldNumber: 2,
				},
				root: {
					dataType: 'bytes',
					fieldNumber: 3,
				},
			},
		},
		networkID: {
			dataType: 'bytes',
			fieldNumber: 3,
		},
		lastCertifiedStateRoot: {
			dataType: 'bytes',
			fieldNumber: 4,
		},
		lastCertifiedTimestamp: {
			dataType: 'uint32',
			fieldNumber: 5,
		},
		lastCertifiedHeight: {
			dataType: 'uint32',
			fieldNumber: 6,
		},
		partnerChainOutboxRoot: {
			dataType: 'bytes',
			fieldNumber: 7,
		},
		partnerChainOutboxSize: {
			dataType: 'uint64',
			fieldNumber: 8,
		},
		partnerChainInboxSize: {
			dataType: 'uint64',
			fieldNumber: 9,
		},
		name: {
			dataType: 'string',
			fieldNumber: 10,
		},
		status: {
			dataType: 'uint32',
			fieldNumber: 11,
		},
		activeValidators: {
			type: 'array',
			fieldNumber: 12,
			items: {
				type: 'object',
				required: ['blsKey', 'bftWeight'],
				properties: {
					blsKey: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					bftWeight: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
				},
			},
		},
		certificateThreshold: {
			dataType: 'uint64',
			fieldNumber: 13,
		},
	},
};

export const terminatedChain = {
	type: 'object',
	required: ['stateRoot'],
	properties: {
		stateRoot: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
	},
};
