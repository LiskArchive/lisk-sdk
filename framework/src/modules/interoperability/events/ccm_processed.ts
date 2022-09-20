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

export interface CcmProcessedEventData {
	ccmID: Buffer;
	status: number;
}

export const ccmProcessedEventSchema = {
	$id: '/interoperability/events/ccmProcessed',
	type: 'object',
	required: ['ccmID', 'status'],
	properties: {
		ccmID: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		status: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
	},
};

export class CcmProcessedEvent extends BaseEvent<CcmProcessedEventData> {
	public schema = ccmProcessedEventSchema;

	public log(
		ctx: EventQueuer,
		sendingChainID: Buffer,
		receivingChainID: Buffer,
		data: CcmProcessedEventData,
	): void {
		this.add(ctx, data, [sendingChainID, receivingChainID, data.ccmID]);
	}
}
