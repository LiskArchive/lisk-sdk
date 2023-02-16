/*
 * Copyright © 2023 Lisk Foundation
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
 *
 */
import { decodeEventData } from './codec';
import { Channel, ModuleMetadata, Event as IEvent, EventJSON, DecodedEvent } from './types';

export class Event {
	private readonly _channel: Channel;
	private readonly _metadata: ModuleMetadata[];

	public constructor(channel: Channel, moduleMetadata: ModuleMetadata[]) {
		this._channel = channel;
		this._metadata = moduleMetadata;
	}

	public async get(
		height: number,
		query: { module?: string; name?: string },
	): Promise<DecodedEvent[]> {
		const decodedEvents: DecodedEvent[] = [];

		const eventsJSON = await this._channel.invoke<EventJSON[]>('chain_getEvents', { height });

		for (const eventJSON of eventsJSON) {
			if (
				(!query.module && !query.name) ||
				(eventJSON.module === query.module && !query.name) ||
				(eventJSON.name === query.name && !query.module) ||
				(eventJSON.module === query.module && eventJSON.name === query.name)
			) {
				const event: IEvent = {
					...eventJSON,
					data: Buffer.from(eventJSON.data, 'hex'),
					topics: eventJSON.topics.map(topic => Buffer.from(topic, 'hex')),
				};

				decodedEvents.push(decodeEventData(event, this._metadata));
			}
		}

		return decodedEvents;
	}
}
