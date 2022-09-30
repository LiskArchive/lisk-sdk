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
import { HASH_LENGTH } from '../constants';

export interface CcmSendSuccessEventData {
	ccmID: Buffer;
}

export const ccmSendSuccessDataSchema = {
	$id: '/interoperability/events/ccmSendSuccess',
	type: 'object',
	required: ['ccmID'],
	properties: {
		ccmID: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: HASH_LENGTH,
			maxLength: HASH_LENGTH,
		},
	},
};

export class CcmSendSuccessEvent extends BaseEvent<CcmSendSuccessEventData> {
	public schema = ccmSendSuccessDataSchema;

	public log(
		ctx: EventQueuer,
		sendingChainID: Buffer,
		receivingChainID: Buffer,
		sentCCMID: Buffer,
		data: CcmSendSuccessEventData,
	): void {
		this.add(ctx, data, [sendingChainID, receivingChainID, sentCCMID]);
	}
}
