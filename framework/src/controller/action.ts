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
import { RequestObject, VERSION } from './jsonrpc';

export interface ActionInfoObject {
	readonly module: string;
	readonly name: string;
	readonly source?: string;
	readonly params: object;
}

export type ActionHandler = (action: ActionInfoObject) => unknown;

export interface ActionsDefinition {
	[key: string]: ActionHandler | { handler: ActionHandler };
}

export interface ActionsObject {
	[key: string]: Action;
}

type ID = string | number | null;

export class Action {
	public jsonrpc = VERSION;
	public id: ID;
	public method: string;
	public params: object;
	public source?: string;
	public handler?: (action: ActionInfoObject) => unknown;

	public constructor(
		id: ID,
		method: string,
		params?: object,
		source?: string,
		handler?: (action: ActionInfoObject) => unknown,
	) {
		assert(
			actionWithModuleNameReg.test(method),
			`Action method "${method}" must be a valid name with module name and action name.`,
		);
		if (source) {
			assert(moduleNameReg.test(source), `Source name "${source}" must be a valid module name.`);
			this.source = source;
		}

		this.id = id;
		this.method = method;
		this.params = params ?? {};
		this.handler = handler;
	}

	public static fromJSONRPC(data: RequestObject | string): Action {
		const { id, method, params } =
			typeof data === 'string' ? (JSON.parse(data) as RequestObject) : data;

		return new Action(id, method, params);
	}

	public toJSONRPC(): RequestObject {
		return {
			jsonrpc: this.jsonrpc,
			id: this.id,
			method: this.method,
			params: this.params,
		};
	}

	public toObject(): ActionInfoObject {
		return {
			module: this.module,
			name: this.name,
			source: this.source,
			params: this.params,
		};
	}

	public get module(): string {
		const [moduleName] = this.method.split(':');
		return moduleName;
	}

	public get name(): string {
		const [, eventName] = this.method.split(':');

		return eventName;
	}

	public key(): string {
		return `${this.module}:${this.name}`;
	}
}
