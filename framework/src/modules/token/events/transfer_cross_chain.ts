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
import {
	CHAIN_ID_LENGTH,
	TOKEN_ID_LENGTH,
	TokenEventResult,
	TokenErrorEventResult,
} from '../constants';

export interface TransferCrossChainEventData {
	senderAddress: Buffer;
	tokenID: Buffer;
	amount: bigint;
	recipientAddress: Buffer;
	receivingChainID: Buffer;
}

export const transferCrossChainEventSchema = {
	$id: '/token/events/transferCrossChain',
	type: 'object',
	required: [
		'senderAddress',
		'recipientAddress',
		'tokenID',
		'amount',
		'receivingChainID',
		'result',
	],
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
		receivingChainID: {
			dataType: 'bytes',
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
			fieldNumber: 5,
		},
		result: {
			dataType: 'uint32',
			fieldNumber: 6,
		},
	},
};

export class TransferCrossChainEvent extends BaseEvent<
	TransferCrossChainEventData & { result: TokenEventResult }
> {
	public schema = transferCrossChainEventSchema;

	public log(ctx: EventQueuer, data: TransferCrossChainEventData): void {
		this.add(ctx, { ...data, result: TokenEventResult.SUCCESSFUL }, [
			data.senderAddress,
			data.recipientAddress,
			data.receivingChainID,
		]);
	}

	public error(
		ctx: EventQueuer,
		data: TransferCrossChainEventData,
		result: TokenErrorEventResult,
	): void {
		this.add(
			ctx,
			{ ...data, result },
			[data.senderAddress, data.recipientAddress, data.receivingChainID],
			true,
		);
	}
}
