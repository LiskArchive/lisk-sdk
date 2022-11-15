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
import { TOKEN_ID_LENGTH, TokenEventResult, TokenErrorEventResult } from '../constants';

export interface TransferEventData {
	senderAddress: Buffer;
	tokenID: Buffer;
	amount: bigint;
	recipientAddress: Buffer;
}

export const transferEventSchema = {
	$id: '/token/events/transfer',
	type: 'object',
	required: ['senderAddress', 'recipientAddress', 'tokenID', 'amount', 'result'],
	properties: {
		senderAddress: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 1,
		},
		recipientAddress: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 2,
		},
		tokenID: {
			dataType: 'bytes',
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
			fieldNumber: 3,
		},
		amount: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
		result: {
			dataType: 'uint32',
			fieldNumber: 5,
		},
	},
};

export class TransferEvent extends BaseEvent<TransferEventData & { result: TokenEventResult }> {
	public schema = transferEventSchema;

	public log(ctx: EventQueuer, data: TransferEventData): void {
		this.add(ctx, { ...data, result: TokenEventResult.SUCCESSFUL }, [
			data.senderAddress,
			data.recipientAddress,
		]);
	}

	public error(ctx: EventQueuer, data: TransferEventData, result: TokenErrorEventResult): void {
		this.add(ctx, { ...data, result }, [data.senderAddress, data.recipientAddress], true);
	}
}
