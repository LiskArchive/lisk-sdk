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
import { BaseEvent } from 'lisk-sdk';

export const newHelloEventSchema = {
	$id: '/hello/events/new_hello',
	type: 'object',
	required: ['senderAddress', 'message'],
	properties: {
		senderAddress: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		message: {
			dataType: 'string',
			fieldNumber: 2,
		},
	},
};

export interface NewHelloEventData {
	senderAddress: Buffer;
	message: string;
}

export class NewHelloEvent extends BaseEvent<NewHelloEventData> {
	public schema = newHelloEventSchema;
}
