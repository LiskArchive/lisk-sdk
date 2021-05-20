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

import { EventCallback } from '../event';
import { Action, ActionsDefinition } from '../action';
import { eventWithModuleNameReg, INTERNAL_EVENTS } from '../../constants';

export interface BaseChannelOptions {
	[key: string]: unknown;
	readonly skipInternalEvents?: boolean;
}

export abstract class BaseChannel {
	public readonly eventsList: ReadonlyArray<string>;
	public readonly actionsList: ReadonlyArray<string>;
	public readonly moduleAlias: string;

	protected readonly actions: { [key: string]: Action };
	protected readonly options: Record<string, unknown>;

	public constructor(
		moduleAlias: string,
		events: ReadonlyArray<string>,
		actions: ActionsDefinition,
		options: BaseChannelOptions = {},
	) {
		this.moduleAlias = moduleAlias;
		this.options = options;

		this.eventsList = options.skipInternalEvents ? events : [...events, ...INTERNAL_EVENTS];

		this.actions = {};
		for (const actionName of Object.keys(actions)) {
			const actionData = actions[actionName];

			const handler = typeof actionData === 'object' ? actionData.handler : actionData;
			const method = `${this.moduleAlias}:${actionName}`;
			this.actions[actionName] = new Action(null, method, undefined, handler);
		}
		this.actionsList = Object.keys(this.actions);
	}

	public isValidEventName(name: string, throwError = true): boolean | never {
		const result = eventWithModuleNameReg.test(name);

		if (throwError && !result) {
			throw new Error(`[${this.moduleAlias}] Invalid event name ${name}.`);
		}
		return result;
	}

	public isValidActionName(name: string, throwError = true): boolean | never {
		const result = eventWithModuleNameReg.test(name);

		if (throwError && !result) {
			throw new Error(`[${this.moduleAlias}] Invalid action name ${name}.`);
		}

		return result;
	}

	// Listen to any event happening in the application
	// Specified as moduleName:eventName
	// If its related to your own moduleAlias specify as :eventName
	abstract subscribe(eventName: string, cb: EventCallback): void;

	// Publish the event on the channel
	// Specified as moduleName:eventName
	// If its related to your own moduleAlias specify as :eventName
	abstract publish(eventName: string, data?: object): void;

	// Call action of any moduleAlias through controller
	// Specified as moduleName:actionName
	abstract invoke<T>(actionName: string, params?: object): Promise<T>;

	abstract registerToBus(arg: unknown): Promise<void>;
	abstract once(eventName: string, cb: EventCallback): void;
}
