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
import { ED25519_PUBLIC_KEY_LENGTH, ED25519_SIGNATURE_LENGTH } from '../constants';

export interface InvalidSignatureEventData {
	numberOfSignatures: number;
	mandatoryKeys: Buffer[];
	optionalKeys: Buffer[];
	failingPublicKey: Buffer;
	failingSignature: Buffer;
}

export const invalidSigDataSchema = {
	$id: '/auth/events/invalidSigData',
	type: 'object',
	required: [
		'numberOfSignatures',
		'mandatoryKeys',
		'optionalKeys',
		'failingPublicKey',
		'failingSignature',
	],
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
		failingPublicKey: {
			dataType: 'bytes',
			minLength: ED25519_PUBLIC_KEY_LENGTH,
			maxLength: ED25519_PUBLIC_KEY_LENGTH,
			fieldNumber: 4,
		},
		failingSignature: {
			dataType: 'bytes',
			minLength: ED25519_SIGNATURE_LENGTH,
			maxLength: ED25519_SIGNATURE_LENGTH,
			fieldNumber: 5,
		},
	},
};

export class InvalidSignatureEvent extends BaseEvent<InvalidSignatureEventData> {
	public schema = invalidSigDataSchema;

	public error(ctx: EventQueuer, senderAddress: Buffer, data: InvalidSignatureEventData): void {
		this.add(ctx, data, [senderAddress], true);
	}
}
