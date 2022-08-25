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
import { ED25519_PUBLIC_KEY_LENGTH, KeyRegResult } from '../constants';

export interface GeneratorKeyRegData {
	generatorKey: Buffer;
	result: KeyRegResult;
}

export const generatorKeyRegDataSchema = {
	$id: '/validators/event/generatorKeyRegData',
	type: 'object',
	required: ['generatorKey', 'result'],
	properties: {
		generatorKey: {
			dataType: 'bytes',
			minLength: ED25519_PUBLIC_KEY_LENGTH,
			maxLength: ED25519_PUBLIC_KEY_LENGTH,
			fieldNumber: 1,
		},
		result: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
	},
};

export class GeneratorKeyRegistrationEvent extends BaseEvent<GeneratorKeyRegData> {
	public schema = generatorKeyRegDataSchema;

	public log(ctx: EventQueuer, validatorAddress: Buffer, data: GeneratorKeyRegData): void {
		const noRevert = data.result !== KeyRegResult.SUCCESS;
		this.add(ctx, data, [validatorAddress], noRevert);
	}
}
