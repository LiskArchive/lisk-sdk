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
 *
 */

export const packetSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		event: {
			type: 'string',
		},
		cid: {
			type: 'integer',
		},
		rid: {
			type: 'integer',
		},
		data: {
			type: 'object',
		},
		error: {
			type: 'object',
		},
	},
};

export const protocolMessageSchema = {
	type: 'object',
	additionalProperties: false,
	required: ['event'],
	properties: {
		event: {
			type: 'string',
		},
		data: {
			type: 'string',
		},
	},
};

export const rpcRequestSchema = {
	type: 'object',
	additionalProperties: false,
	required: ['procedure'],
	properties: {
		procedure: {
			type: 'string',
		},
		data: {
			type: 'string',
		},
	},
};
