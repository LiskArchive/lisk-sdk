/*
 * Copyright © 2020 Lisk Foundation
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

export const nodeInfoSchema = {
	$id: '/nodeInfo',
	type: 'object',
	properties: {
		networkId: {
			dataType: 'string',
			fieldNumber: 1,
		},
		protocolVersion: {
			dataType: 'string',
			fieldNumber: 2,
		},
		wsPort: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		nonce: {
			dataType: 'string',
			fieldNumber: 4,
		},
		advertiseAddress: {
			dataType: 'boolean',
			fieldNumber: 5,
		},
		os: {
			dataType: 'string',
			fieldNumber: 6,
		},
		height: {
			dataType: 'uint32',
			fieldNumber: 7,
		},
	},
	required: ['networkId', 'protocolVersion', 'wsPort', 'nonce'],
};

export const peerInfoSchema = {
	$id: '/peerInfo',
	type: 'object',
	properties: {
		ipAddress: {
			dataType: 'string',
			fieldNumber: 1,
		},
		wsPort: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		networkId: {
			dataType: 'string',
			fieldNumber: 3,
		},
		protocolVersion: {
			dataType: 'string',
			fieldNumber: 4,
		},
		nonce: {
			dataType: 'string',
			fieldNumber: 5,
		},
		os: {
			dataType: 'string',
			fieldNumber: 6,
		},
		height: {
			dataType: 'uint32',
			fieldNumber: 7,
		},
	},
	required: ['ipAddress', 'wsPort'],
};
