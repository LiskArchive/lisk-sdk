/*
 * Copyright © 2022 Lisk Foundation
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

import { BaseEvent, EventQueuer } from '../../base_event';
import { terminatedOutboxSchema } from '../stores/terminated_outbox';

export interface TerminatedOutboxCreatedEventData {
	ccmID: Buffer;
}

export class TerminatedOutboxCreatedEvent extends BaseEvent<TerminatedOutboxCreatedEventData> {
	public schema = terminatedOutboxSchema;

	public log(ctx: EventQueuer, chainID: Buffer, data: TerminatedOutboxCreatedEventData): void {
		this.add(ctx, data, [chainID]);
	}
}
