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

import { Schema } from '@liskhq/lisk-codec';

export const nodeInfoSchema = {
	$id: '/nodeInfo',
	type: 'object',
	properties: {
		chainID: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		networkVersion: {
			dataType: 'string',
			fieldNumber: 2,
		},
		nonce: {
			dataType: 'string',
			fieldNumber: 3,
		},
		advertiseAddress: {
			dataType: 'boolean',
			fieldNumber: 4,
		},
	},
	required: ['chainID', 'networkVersion', 'nonce', 'advertiseAddress'],
};

export const peerInfoSchema = {
	$id: '/protocolPeerInfo',
	type: 'object',
	properties: {
		ipAddress: {
			dataType: 'string',
			fieldNumber: 1,
		},
		port: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
	},
	required: ['ipAddress', 'port'],
};

export const peerRequestResponseSchema = {
	$id: '/protocolPeerRequestResponse',
	type: 'object',
	properties: {
		peers: {
			type: 'array',
			fieldNumber: 1,
			items: {
				dataType: 'bytes',
			},
		},
	},
	required: ['peers'],
};

export const defaultRPCSchemas = {
	peerInfo: peerInfoSchema,
	nodeInfo: nodeInfoSchema,
	peerRequestResponse: peerRequestResponseSchema,
};

export const mergeCustomSchema = (baseSchema: Schema, customSchema: Schema): Schema => ({
	...baseSchema,
	properties: {
		...baseSchema.properties,
		options: {
			type: 'object',
			fieldNumber: 5,
			properties: { ...customSchema.properties },
		},
	},
});
