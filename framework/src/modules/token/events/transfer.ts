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

export const enum TransferEventResult {
	SUCCESSFUL = 0,
	FAIL_INSUFFICIENT_BALANCE = 1,
	FAIL_RECIPIENT_NOT_INITIALIZED = 2,
}

export interface TransferEventData {
	senderAddress: Buffer;
	tokenID: Buffer;
	amount: bigint;
	recipientAddress: Buffer;
	result: TransferEventResult;
}

export const transferEventSchema = {
	$id: '/token/events/transfer',
	type: 'object',
	required: ['senderAddress', 'recipientAddress', 'tokenID', 'amount', 'result'],
	properties: {
		senderAddress: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		tokenID: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		amount: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
		recipientAddress: {
			dataType: 'bytes',
			fieldNumber: 4,
		},
		result: {
			dataType: 'uint32',
			fieldNumber: 5,
		},
	},
};

export class TransferEvent extends BaseEvent<TransferEventData> {
	public log(ctx: EventQueuer, data: TransferEventData): void {
		const amountBuffer = Buffer.alloc(8);
		amountBuffer.writeBigUInt64BE(data.amount);
		this.add(ctx, data, [data.senderAddress, data.tokenID, amountBuffer, data.recipientAddress]);
	}
}
