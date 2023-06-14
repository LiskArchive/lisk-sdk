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
import { validator } from '@liskhq/lisk-validator';
import {
	JSONRPCErrorObject,
	ID,
	NotificationRequest,
	JSONRPCResult,
	ResponseObjectWithResult,
	ResponseObjectWithError,
	RequestObject,
} from './types';

export const VERSION = '2.0';

const requestSchema = {
	$id: '/jsonRPCRequestSchema',
	type: 'object',
	required: ['jsonrpc', 'method', 'id'],
	properties: {
		jsonrpc: {
			type: 'string',
			const: '2.0',
		},
		method: {
			type: 'string',
		},
		id: {
			type: ['number', 'string', 'null'], // https://www.jsonrpc.org/specification#id1
		},
		params: {
			type: 'object',
		},
	},
	additionalProperties: false,
};

const notificationSchema = {
	$id: '/jsonRPCNotificationSchema',
	type: 'object',
	required: ['jsonrpc', 'method'],
	properties: {
		jsonrpc: {
			type: 'string',
			const: '2.0',
		},
		method: {
			type: 'string',
		},
		params: {
			type: 'object',
		},
	},
	additionalProperties: false,
};

export function validateJSONRPCRequest(data: unknown): asserts data is RequestObject {
	if (typeof data !== 'object' || data === null) {
		throw new Error('Data must be type of object.');
	}
	validator.validate(requestSchema, data);
}

export const validateJSONRPCNotification = (data: Record<string, unknown>): void => {
	validator.validate(notificationSchema, data);
};

export const notificationRequest = (
	method: string,
	params?: Record<string, unknown>,
): NotificationRequest => ({
	jsonrpc: VERSION,
	method,
	params,
});

export const successResponse = (id: ID, result: JSONRPCResult): ResponseObjectWithResult => ({
	jsonrpc: VERSION,
	id,
	result,
});

export const errorResponse = (id: ID, error: JSONRPCErrorObject): ResponseObjectWithError => ({
	jsonrpc: VERSION,
	id,
	error,
});

export const invalidRequest = (msg?: string): JSONRPCErrorObject => ({
	message: msg ?? 'Invalid request',
	code: -32600,
});

export const methodNotFound = (): JSONRPCErrorObject => ({
	message: 'Method not found',
	code: -32601,
});

export const invalidParams = (): JSONRPCErrorObject => ({
	message: 'Invalid params',
	code: -32602,
});

export const internalError = (data?: JSONRPCResult): JSONRPCErrorObject => {
	if (data) {
		return { message: 'Internal error', code: -32603, data };
	}
	return { message: 'Internal error', code: -32603 };
};

export const parseError = (): JSONRPCErrorObject => ({ message: 'Parse error', code: -32700 });

export class JSONRPCError extends Error {
	public response: ResponseObjectWithError;

	public constructor(message: string, error: ResponseObjectWithError) {
		super(message);
		this.response = error;
	}
}
