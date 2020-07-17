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
import axios, { AxiosError } from 'axios';
import * as Debug from 'debug';

import { Webhook } from './types';
// eslint-disable-next-line new-cap
const debug = Debug('plugin:forger:webhooks');

interface HttpHeaders {
	[key: string]: string;
}

interface BlockCreated {
	readonly height: number;
	readonly reward: string;
	readonly forgerAddress: string;
}

interface BlockMissed {
	readonly height: number;
	readonly missedBlocksByAddress: { [key: string]: number };
}

interface NodeStatusChange {
	readonly reason: string;
}

interface WebHookPayload {
	readonly event: string;
	readonly timestamp: number;
	readonly payload: BlockCreated | BlockMissed | NodeStatusChange;
}

export class Webhooks {
	private readonly headers: HttpHeaders;
	private readonly registeredEvents: readonly Webhook[];

	public constructor(defaultHeaders: HttpHeaders, configuredEvents: readonly Webhook[]) {
		this.headers = defaultHeaders;
		this.registeredEvents = configuredEvents;
	}

	public async execute(eventData: WebHookPayload, targetURL: string): Promise<object> {
		return axios.post(targetURL, eventData, { headers: this.headers });
	}

	public async handleEvent(data: WebHookPayload): Promise<void> {
		const requiredEvents = [];
		for (const aRegisteredEvent of this.registeredEvents) {
			if (aRegisteredEvent.events.includes(data.event)) {
				requiredEvents.push({ url: aRegisteredEvent.url, data });
			}
		}

		for (const anEvent of requiredEvents) {
			try {
				await this.execute(anEvent.data, anEvent.url);
			} catch (err) {
				debug('Error during webhook processing', err, (err as AxiosError).response?.data);
			}
		}
	}
}
