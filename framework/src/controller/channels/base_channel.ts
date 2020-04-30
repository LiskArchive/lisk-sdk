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

import { Event, EventCallback } from '../event';
import { Action, ActionCallback } from '../action';
import { INTERNAL_EVENTS, eventWithModuleNameReg } from './base/constants';

export interface BaseChannelOptions {
	readonly skipInternalEvents?: boolean;
}

export abstract class BaseChannel {
	public readonly moduleAlias: string;
	public readonly options: object;

	public readonly eventsList: ReadonlyArray<Event>;
	public readonly actionsList: ReadonlyArray<Action>;
	public readonly actions: { [key: string]: ActionCallback };

	protected constructor(
		moduleAlias: string,
		events: ReadonlyArray<string>,
		actions: { [key: string]: ActionCallback },
		options: BaseChannelOptions = {},
	) {
		this.moduleAlias = moduleAlias;
		this.options = options;

		const eventList = options.skipInternalEvents
			? events
			: [...events, ...INTERNAL_EVENTS];

		this.eventsList = eventList.map(
			eventName => new Event(`${this.moduleAlias}:${eventName}`),
		);

		this.actionsList = Object.keys(actions).map(
			actionName => new Action(`${this.moduleAlias}:${actionName}`),
		);

		this.actions = actions;
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

	abstract async registerToBus(): Promise<void>;

	// Listen to any event happening in the application
	// Specified as moduleName:eventName
	// If its related to your own moduleAlias specify as :eventName
	abstract subscribe(eventName: string, cb: EventCallback): void;

	// Publish the event on the channel
	// Specified as moduleName:eventName
	// If its related to your own moduleAlias specify as :eventName
	abstract publish(eventName: string, data: object): void;

	// Publish to the network by invoking send/broadcast actions in the network
	// Specified as actionName for send or broadcast available on the network
	// If its related to your own moduleAlias specify as :eventName
	abstract publishToNetwork(actionName: string, data: object): void;

	// Call action of any moduleAlias through controller
	// Specified as moduleName:actionName
	abstract async invoke(actionName: string, params?: object): Promise<void>;

	// Call action network module when requesting from the network or a specific peer
	// Specified as actionName for request available on the network
	abstract async invokeFromNetwork(
		actionName: string,
		params?: object,
	): Promise<void>;

	// Call action of any moduleAlias through controller
	// Specified as moduleName:actionName
	// Specified action must be defined as publicly callable
	abstract async invokePublic(
		actionName: string,
		params?: object,
	): Promise<void>;
}
