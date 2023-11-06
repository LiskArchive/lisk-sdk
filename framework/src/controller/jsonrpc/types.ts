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
export type JSONRPCResult = string | number | boolean | object;

export interface JSONRPCErrorObject {
	code: number;
	message: string;
	data?: JSONRPCResult;
}

export interface RequestObject {
	readonly id: ID;
	readonly jsonrpc: string;
	readonly method: string;
	readonly params?: Record<string, unknown>;
}

export type NotificationRequest = Omit<RequestObject, 'id'>;

export interface ResponseObjectWithError {
	readonly id: ID;
	readonly jsonrpc: string;
	readonly error: JSONRPCErrorObject;
	readonly result?: never;
}

export interface ResponseObjectWithResult<T = JSONRPCResult> {
	readonly id: ID;
	readonly jsonrpc: string;
	readonly error?: never;
	readonly result: T;
}

export type ResponseObject<T = JSONRPCResult> =
	| ResponseObjectWithError
	| ResponseObjectWithResult<T>;
