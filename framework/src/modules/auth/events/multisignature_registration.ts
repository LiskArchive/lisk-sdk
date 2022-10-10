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
import { ED25519_PUBLIC_KEY_LENGTH } from '../constants';

export interface MultisignatureRegistrationEventData {
	numberOfSignatures: number;
	mandatoryKeys: Buffer[];
	optionalKeys: Buffer[];
}

export const multisigRegDataSchema = {
	$id: '/auth/events/multisigRegData',
	type: 'object',
	required: ['numberOfSignatures', 'mandatoryKeys', 'optionalKeys'],
	properties: {
		numberOfSignatures: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		mandatoryKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
				minLength: ED25519_PUBLIC_KEY_LENGTH,
				maxLength: ED25519_PUBLIC_KEY_LENGTH,
			},
			fieldNumber: 2,
		},
		optionalKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
				minLength: ED25519_PUBLIC_KEY_LENGTH,
				maxLength: ED25519_PUBLIC_KEY_LENGTH,
			},
			fieldNumber: 3,
		},
	},
};

export class MultisignatureRegistrationEvent extends BaseEvent<MultisignatureRegistrationEventData> {
	public schema = multisigRegDataSchema;

	public log(
		ctx: EventQueuer,
		senderAddress: Buffer,
		data: MultisignatureRegistrationEventData,
	): void {
		this.add(ctx, data, [senderAddress]);
	}
}
