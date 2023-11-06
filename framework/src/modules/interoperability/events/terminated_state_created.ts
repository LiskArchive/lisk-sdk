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
import { TerminatedStateAccount, terminatedStateSchema } from '../stores/terminated_state';

export class TerminatedStateCreatedEvent extends BaseEvent<TerminatedStateAccount> {
	public schema = terminatedStateSchema;

	public log(ctx: EventQueuer, chainID: Buffer, data: TerminatedStateAccount): void {
		this.add(ctx, data, [chainID]);
	}
}
