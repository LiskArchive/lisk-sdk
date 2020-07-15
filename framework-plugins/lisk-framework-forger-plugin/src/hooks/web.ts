/*
 * Copyright © 2020 Lisk Foundation
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
import axios from 'axios';
import * as Debug from 'debug';

import { Webhook } from '../types';
// eslint-disable-next-line new-cap
const debug = Debug('plugin:forger:webhooks');

interface httpHeaders {
	[key: string]: string;
}

interface blockCreated {
	readonly height: number;
	readonly reward: string;
	readonly forgerAddress: string;
}

interface blockMissed {
	readonly reason: string;
	readonly address: string;
}

interface nodeStarted {
	readonly reason: string;
}
interface nodeStopped {
	readonly reason: string;
}

interface webHookPayload {
	readonly event: string;
	readonly time: Date;
	readonly payload: blockCreated | blockMissed | nodeStarted | nodeStopped;
}

export class Web {
	private readonly headers: httpHeaders;
	private readonly registeredEvents: readonly Webhook[];

	public constructor(defaultHeaders: httpHeaders, configuredEvents: readonly Webhook[]) {
		this.headers = defaultHeaders;
		this.registeredEvents = configuredEvents;
	}

	public async execute(eventData: webHookPayload, targetURL: string): Promise<object> {
		return axios.post(targetURL, eventData, { headers: this.headers });
	}

	public async handleEvent(event: string, data: webHookPayload): Promise<void> {
		const requiredEvents = [];
		for (const aRegisteredEvent of this.registeredEvents) {
			if (aRegisteredEvent.events.includes(event)) {
				requiredEvents.push({ url: aRegisteredEvent.url, data });
			}
		}

		try {
			for (const anEvent of requiredEvents) {
				// eslint-disable-next-line no-void
				await this.execute(anEvent.data, anEvent.url);
			}
		} catch (err) {
			debug('Error during webhook processing');
			debug(err);
		}
	}
}
