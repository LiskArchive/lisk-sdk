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
import { BLS_POP_LENGTH, BLS_PUBLIC_KEY_LENGTH, KeyRegResult } from '../constants';

export interface BLSKeyRegData {
	blsKey: Buffer;
	proofOfPossession: Buffer;
	result: KeyRegResult;
}

export const blsKeyRegDataSchema = {
	$id: '/validators/event/blsKeyRegData',
	type: 'object',
	required: ['blsKey', 'result'],
	properties: {
		blsKey: {
			dataType: 'bytes',
			minLength: BLS_PUBLIC_KEY_LENGTH,
			maxLength: BLS_PUBLIC_KEY_LENGTH,
			fieldNumber: 1,
		},
		proofOfPossession: {
			dataType: 'bytes',
			minLength: BLS_POP_LENGTH,
			maxLength: BLS_POP_LENGTH,
			fieldNumber: 2,
		},
		result: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};

export class BlsKeyRegistrationEvent extends BaseEvent<BLSKeyRegData> {
	public schema = blsKeyRegDataSchema;

	public log(ctx: EventQueuer, validatorAddress: Buffer, data: BLSKeyRegData): void {
		const noRevert = data.result !== KeyRegResult.SUCCESS;
		this.add(ctx, data, [validatorAddress], noRevert);
	}
}
