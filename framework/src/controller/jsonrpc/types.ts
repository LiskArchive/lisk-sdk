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
export type Result = string | number | boolean | object;
export interface SuccessObject {
	jsonrpc: string;
	id: ID;
	result: Result;
}
export interface NotificationObject {
	jsonrpc: string;
	method: string;
	result?: Result;
}
export interface JsonRpcError {
	code: number;
	message: string;
	data?: Result;
}
export interface ErrorObject {
	jsonrpc: string;
	id: ID;
	error: JsonRpcError;
}
export interface RequestObject {
	readonly id: string | number | null;
	readonly jsonrpc: string;
	readonly method: string;
	readonly params?: object;
}
