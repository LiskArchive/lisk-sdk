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

export type ID = string | number | null;
export type Result = string | number | boolean | object;
export type SuccessObject = { jsonrpc: string; id: ID; result: Result };
export type JsonRpcError = { code: number; message: string; data?: Result };
export type ErrorObject = { jsonrpc: string; id: ID; error: JsonRpcError };

const VERSION = '2.0';

const RequestSchema = {
	id: 'jsonRPCRequestSchema',
	type: 'object',
	required: ['jsonrpc', 'method', 'id'],
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

export const validateJSONRPC = (data: object): void => {
	const errors = validator.validate(RequestSchema, data);
	if (errors.length) {
		throw new LiskValidationError(errors);
	}
};

export const successObject = (id: ID, result: Result): SuccessObject => ({
	jsonrpc: VERSION,
	id,
	result,
});

export const errorObject = (id: ID, error: JsonRpcError): ErrorObject => ({
	jsonrpc: VERSION,
	id,
	error,
});

export const invalidRequest = (): JsonRpcError => ({ message: 'Invalid request', code: -32600 });

export const methodNotFound = (): JsonRpcError => ({ message: 'Method not found', code: -32601 });

export const invalidParams = (): JsonRpcError => ({ message: 'Invalid params', code: -32602 });

export const internalError = (data?: Result): JsonRpcError => {
	if (data) {
		return { message: 'Internal error', code: -32603, data };
	}
	return { message: 'Internal error', code: -32603 };
};

export const parseError = (): JsonRpcError => ({ message: 'Parse error', code: -32700 });
