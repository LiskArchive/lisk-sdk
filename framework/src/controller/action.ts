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
import { actionWithModuleNameReg } from '../constants';
import {
	ID,
	JSONRPCErrorObject,
	JSONRPCResult,
	RequestObject,
	ResponseObject,
	VERSION,
} from './jsonrpc';

export type ActionHandler = (params?: Record<string, unknown>) => unknown;

export interface ActionsDefinition {
	[key: string]: ActionHandler | { handler: ActionHandler };
}

export interface ActionsObject {
	[key: string]: Action;
}

export class Action {
	public readonly id: ID;
	public readonly module: string;
	public readonly name: string;
	public readonly params?: Record<string, unknown>;
	public handler?: ActionHandler;

	public constructor(
		id: ID,
		name: string,
		params?: Record<string, unknown>,
		handler?: ActionHandler,
	) {
		assert(
			actionWithModuleNameReg.test(name),
			`Action name "${name}" must be a valid name with module name and action name.`,
		);

		this.id = id;
		[this.module, this.name] = name.split(':');
		this.params = params ?? {};
		this.handler = handler;
	}

	public static fromJSONRPCRequest(data: RequestObject | string): Action {
		const { id, method, params } =
			typeof data === 'string' ? (JSON.parse(data) as RequestObject) : data;

		return new Action(id, method, params);
	}

	public toJSONRPCRequest(): RequestObject {
		return {
			jsonrpc: VERSION,
			id: this.id,
			method: `${this.module}:${this.name}`,
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
		return `${this.module}:${this.name}`;
	}
}
