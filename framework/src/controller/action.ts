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

const moduleNameReg = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const actionWithModuleNameReg = /^[a-zA-Z][a-zA-Z0-9_]*:[a-zA-Z][a-zA-Z0-9]*$/;

export interface ActionObject {
	readonly module: string;
	readonly name: string;
	readonly source?: string;
	readonly params?: object;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionCallback = (action: ActionObject) => any;

export interface ActionsObject {
	[key: string]: Action;
}

export class Action {
	public module: string;
	public name: string;
	public source?: string;
	public params?: object;
	public isPublic?: boolean;

	public constructor(name: string, params?: object, source?: string) {
		assert(
			actionWithModuleNameReg.test(name),
			`Action name "${name}" must be a valid name with module name.`,
		);
		[this.module, this.name] = name.split(':');
		this.params = params;

		if (source) {
			assert(
				moduleNameReg.test(source),
				`Source name "${source}" must be a valid module name.`,
			);
			this.source = source;
		}
	}

	public static deserialize(data: ActionObject | string): Action {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const parsedAction: ActionObject =
			typeof data === 'string' ? JSON.parse(data) : data;

		return new Action(
			`${parsedAction.module}:${parsedAction.name}`,
			parsedAction.params,
			parsedAction.source,
		);
	}

	public serialize(): ActionObject {
		return {
			name: this.name,
			module: this.module,
			source: this.source,
			params: this.params,
		};
	}

	public toString(): string {
		return `${this.source ?? 'undefined'} -> ${this.module}:${this.name}`;
	}

	public key(): string {
		return `${this.module}:${this.name}`;
	}
}
