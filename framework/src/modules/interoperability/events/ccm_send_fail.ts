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
import { ccmSchema } from '../schemas';
import { CCMsg } from '../types';

export interface CcmSendFailEventData {
	ccm: CCMsg;
	code: number;
}

export const ccmSendFailDataSchema = {
	$id: '/interoperability/events/ccmSendFail',
	type: 'object',
	required: ['ccm', 'code'],
	properties: {
		ccm: {
			...ccmSchema,
			fieldNumber: 1,
		},
		code: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
	},
};

export class CcmSendFailEvent extends BaseEvent<CcmSendFailEventData> {
	public schema = ccmSendFailDataSchema;

	public log(ctx: EventQueuer, data: CcmSendFailEventData, noRevert: boolean): void {
		this.add(ctx, data, [], noRevert);
	}
}
