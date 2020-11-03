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
import * as JSONRPC from './jsonrpc';

export interface ActionInfoObject {
	readonly id: JSONRPC.ID;
	readonly jsonrpc: string;
	readonly method: string;
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
	public jsonrpc = '2.0';
	public id: JSONRPC.ID;
	public method: string;
	public params: object | undefined;
	public handler?: (action: ActionInfoObject) => unknown;
	public module: string;
	public name: string;

	public constructor(
		id: JSONRPC.ID,
		method: string,
		params?: object,
		handler?: (action: ActionInfoObject) => unknown,
	) {
		assert(
			actionWithModuleNameReg.test(method),
			`Action method "${method}" must be a valid name with module name and action name.`,
		);
		this.id = id;
		this.method = method;
		[this.module, this.name] = this.method.split(':');
		this.params = params ?? {};

		this.handler = handler;
	}

	public static deserialize(data: ActionInfoObject | string): Action {
		const parsedAction = typeof data === 'string' ? (JSON.parse(data) as ActionInfoObject) : data;

		return new Action(parsedAction.id, parsedAction.method, parsedAction.params);
	}

	public serialize(): ActionInfoObject {
		return {
			jsonrpc: this.jsonrpc,
			id: this.id,
			method: this.method,
			params: this.params,
		};
	}

	public key(): string {
		return `${this.module}:${this.name}`;
	}
}
