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
import { actionWithModuleNameReg, moduleNameReg } from '../constants';
import {
	ID,
	JSONRPCErrorObject,
	JSONRPCResult,
	RequestObject,
	ResponseObject,
	VERSION,
} from './jsonrpc';

export interface ActionInfoObject {
	readonly module: string;
	readonly name: string;
	readonly source?: string;
	readonly params?: object;
}

export type ActionHandler = (action: ActionInfoObject) => unknown;

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
	public readonly source?: string;
	public readonly params?: object;
	public handler?: (action: ActionInfoObject) => unknown;

	public constructor(
		id: ID,
		name: string,
		params?: object,
		source?: string,
		handler?: (action: ActionInfoObject) => unknown,
	) {
		assert(
			actionWithModuleNameReg.test(name),
			`Action name "${name}" must be a valid name with module name and action name.`,
		);
		if (source) {
			assert(moduleNameReg.test(source), `Source name "${source}" must be a valid module name.`);
			this.source = source;
		}

		this.id = id;
		[this.module, this.name] = name.split(':');
		this.params = params ?? {};
		this.handler = handler;
	}

	public static fromJSONRPCRequest(data: RequestObject | string): Action {
		const { id, method, params } =
			typeof data === 'string' ? (JSON.parse(data) as RequestObject) : data;

		if (params) {
			const { source, ...rest } = params;

			return new Action(id, method, rest, source);
		}

		return new Action(id, method, params);
	}

	public toJSONRPCRequest(): RequestObject {
		return {
			jsonrpc: VERSION,
			id: this.id,
			method: `${this.module}:${this.name}`,
			params: { ...this.params, source: this.source },
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

		if (result) {
			return { id: this.id, jsonrpc: VERSION, result };
		}

		throw new Error('Response must be sent with result or error');
	}

	public toObject(): ActionInfoObject {
		return { module: this.module, name: this.name, source: this.source, params: this.params };
	}

	public key(): string {
		return `${this.module}:${this.name}`;
	}
}
