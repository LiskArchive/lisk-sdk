/*
 * Copyright © 2019 Lisk Foundation
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

import { strict as assert } from 'assert';
import { actionWithModuleNameReg, controlReg } from '../constants';
import { getEndpointPath } from '../endpoint';
import {
	ID,
	JSONRPCErrorObject,
	JSONRPCResult,
	RequestObject,
	ResponseObject,
	VERSION,
} from './jsonrpc';

export class Request {
	public readonly id: ID;
	public readonly namespace: string;
	public readonly name: string;
	public readonly params?: Record<string, unknown>;

	public constructor(id: ID, name: string, params?: Record<string, unknown>) {
		assert(
			actionWithModuleNameReg.test(name),
			`Request name "${name.replace(
				controlReg,
				'',
			)}" must be a valid name with module name and action name.`,
		);

		this.id = id;
		[this.namespace, this.name] = name.split('_');
		this.params = params ?? {};
	}

	public static fromJSONRPCRequest(data: RequestObject | string): Request {
		const { id, method, params } =
			typeof data === 'string' ? (JSON.parse(data) as RequestObject) : data;

		return new Request(id, method, params);
	}

	public toJSONRPCRequest(): RequestObject {
		return {
			jsonrpc: VERSION,
			id: this.id,
			method: getEndpointPath(this.namespace, this.name),
			params: this.params,
		};
	}

	public buildJSONRPCResponse<T = JSONRPCResult>({
		error,
		result,
	}: {
		error?: JSONRPCErrorObject;
		result?: T;
	}): ResponseObject<T> {
		if (error) {
			return { id: this.id, jsonrpc: VERSION, error };
		}

		return { id: this.id, jsonrpc: VERSION, result: result as T };
	}

	public key(): string {
		return getEndpointPath(this.namespace, this.name);
	}
}
