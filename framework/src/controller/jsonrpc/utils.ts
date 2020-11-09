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

import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import {
	JSONRPCError,
	ID,
	NotificationRequest,
	JSONRPCResult,
	ResponseObjectWithResult,
	ResponseObjectWithError,
} from './types';

export const VERSION = '2.0';

const RequestSchema = {
	id: 'jsonRPCRequestSchema',
	type: 'object',
	required: ['jsonrpc', 'method'],
	properties: {
		jsonrpc: {
			type: 'string',
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
};

export const validateJSONRPCRequest = (data: Record<string, unknown>): void => {
	const errors = validator.validate(RequestSchema, data);
	if (errors.length) {
		throw new LiskValidationError(errors);
	}
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

export const errorResponse = (id: ID, error: JSONRPCError): ResponseObjectWithError => ({
	jsonrpc: VERSION,
	id,
	error,
});

export const invalidRequest = (): JSONRPCError => ({ message: 'Invalid request', code: -32600 });

export const methodNotFound = (): JSONRPCError => ({ message: 'Method not found', code: -32601 });

export const invalidParams = (): JSONRPCError => ({ message: 'Invalid params', code: -32602 });

export const internalError = (data?: JSONRPCResult): JSONRPCError => {
	if (data) {
		return { message: 'Internal error', code: -32603, data };
	}
	return { message: 'Internal error', code: -32603 };
};

export const parseError = (): JSONRPCError => ({ message: 'Parse error', code: -32700 });
