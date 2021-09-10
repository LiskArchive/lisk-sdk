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
import { eventWithModuleNameReg, INTERNAL_EVENTS } from '../../constants';
import { EndpointHandlers } from '../../types';
import { Logger } from '../../logger';

export interface BaseChannelOptions {
	[key: string]: unknown;
	readonly skipInternalEvents?: boolean;
}

export abstract class BaseChannel {
	public readonly eventsList: ReadonlyArray<string>;
	public readonly endpointsList: ReadonlyArray<string>;
	public readonly namespace: string;

	protected readonly endpointHandlers: EndpointHandlers;
	protected readonly options: Record<string, unknown>;
	protected readonly _logger: Logger;
	private _requestId: number;

	public constructor(
		logger: Logger,
		namespace: string,
		events: ReadonlyArray<string>,
		endpoints: EndpointHandlers,
		options: BaseChannelOptions = {},
	) {
		this._logger = logger;
		this.namespace = namespace;
		this.options = options;

		this.eventsList = options.skipInternalEvents ? events : [...events, ...INTERNAL_EVENTS];

		this.endpointHandlers = {};
		this._requestId = 0;
		for (const methodName of Object.keys(endpoints)) {
			const handler = endpoints[methodName];
			this.endpointHandlers[methodName] = handler;
		}
		this.endpointsList = Object.keys(this.endpointHandlers);
	}

	public isValidEventName(name: string, throwError = true): boolean | never {
		const result = eventWithModuleNameReg.test(name);

		if (throwError && !result) {
			throw new Error(`[${this.namespace}] Invalid event name ${name}.`);
		}
		return result;
	}

	public isValidActionName(name: string, throwError = true): boolean | never {
		const result = eventWithModuleNameReg.test(name);

		if (throwError && !result) {
			throw new Error(`[${this.namespace}] Invalid action name ${name}.`);
		}

		return result;
	}

	protected _getNextRequestId(): string {
		this._requestId += 1;
		return this._requestId.toString();
	}

	// Listen to any event happening in the application
	// Specified as moduleName:eventName
	// If its related to your own moduleName specify as :eventName
	abstract subscribe(eventName: string, cb: EventCallback): void;
	abstract unsubscribe(eventName: string, cb: EventCallback): void;

	// Publish the event on the channel
	// Specified as moduleName:eventName
	// If its related to your own moduleName specify as :eventName
	abstract publish(eventName: string, data?: Record<string, unknown>): void;

	// Call action of any moduleName through controller
	// Specified as moduleName:actionName
	abstract invoke<T>(actionName: string, params?: Record<string, unknown>): Promise<T>;

	abstract registerToBus(arg: unknown): Promise<void>;
	abstract once(eventName: string, cb: EventCallback): void;
}
