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
import { eventWithModuleNameReg } from '../../constants';
import { EndpointHandlers } from '../../types';
import { Logger } from '../../logger';

export interface InvokeRequest {
	methodName: string;
	context: {
		header?: { height: number; timestamp: number; aggregateCommit: { height: number } };
	};
	params?: Record<string, unknown>;
}

export abstract class BaseChannel {
	public readonly eventsList: ReadonlyArray<string>;
	public readonly endpointsList: ReadonlyArray<string>;
	public readonly namespace: string;

	protected readonly endpointHandlers: EndpointHandlers;
	protected readonly _logger: Logger;
	private _requestId: number;

	public constructor(
		logger: Logger,
		namespace: string,
		events: ReadonlyArray<string>,
		endpoints: EndpointHandlers,
	) {
		this._logger = logger;
		this.namespace = namespace;

		this.eventsList = events;

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
	// Specified as moduleName_eventName
	// If its related to your own moduleName specify as :eventName
	public abstract subscribe(eventName: string, cb: EventCallback): void;
	public abstract unsubscribe(eventName: string, cb: EventCallback): void;

	// Publish the event on the channel
	// Specified as moduleName_eventName
	// If its related to your own moduleName specify as :eventName
	public abstract publish(eventName: string, data?: Record<string, unknown>): void;

	// Call action of any moduleName through controller
	// Specified as moduleName_actionName
	public abstract invoke<T>(req: InvokeRequest): Promise<T>;

	public abstract registerToBus(arg: unknown): Promise<void>;
	public abstract once(eventName: string, cb: EventCallback): void;
}
