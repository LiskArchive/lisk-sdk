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

export type ID = string | number | null;
export type JsonRpcResult = string | number | boolean | object;

export interface JsonRpcError {
	code: number;
	message: string;
	data?: JsonRpcResult;
}

export interface RequestObject {
	readonly id: ID;
	readonly jsonrpc: string;
	readonly method: string;
	readonly params?: object & { source?: string };
}

export type NotificationRequest = Omit<RequestObject, 'id'>;

export interface ResponseObjectWithError {
	readonly id: ID;
	readonly jsonrpc: string;
	readonly error: JsonRpcError;
	readonly result?: never;
}

export interface ResponseObjectWithResult<T = JsonRpcResult> {
	readonly id: ID;
	readonly jsonrpc: string;
	readonly error?: never;
	readonly result: T;
}

export type ResponseObject<T = JsonRpcResult> =
	| ResponseObjectWithError
	| ResponseObjectWithResult<T>;
