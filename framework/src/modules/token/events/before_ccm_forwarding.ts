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
	TOKEN_ID_LENGTH,
	TokenEventResult,
	TokenErrorEventResult,
	CHAIN_ID_LENGTH,
} from '../constants';

export interface BeforeCCMForwardingEventData {
	sendingChainID: Buffer;
	receivingChainID: Buffer;
	messageFeeTokenID: Buffer;
	messageFee: bigint;
}

export const beforeCCMForwardingEventSchema = {
	$id: '/token/events/beforeCCMForwarding',
	type: 'object',
	required: ['sendingChainID', 'receivingChainID', 'messageFeeTokenID', 'messageFee', 'result'],
	properties: {
		sendingChainID: {
			dataType: 'bytes',
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
			fieldNumber: 1,
		},
		receivingChainID: {
			dataType: 'bytes',
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
			fieldNumber: 2,
		},
		messageFeeTokenID: {
			dataType: 'bytes',
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
			fieldNumber: 3,
		},
		messageFee: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
		result: {
			dataType: 'uint32',
			fieldNumber: 5,
		},
	},
};

export class BeforeCCMForwardingEvent extends BaseEvent<
	BeforeCCMForwardingEventData & { result: TokenEventResult }
> {
	public schema = beforeCCMForwardingEventSchema;

	public log(ctx: EventQueuer, data: BeforeCCMForwardingEventData): void {
		this.add(ctx, { ...data, result: TokenEventResult.SUCCESSFUL }, [
			data.sendingChainID,
			data.receivingChainID,
		]);
	}

	public error(
		ctx: EventQueuer,
		data: BeforeCCMForwardingEventData,
		result: TokenErrorEventResult,
	): void {
		this.add(ctx, { ...data, result }, [data.sendingChainID, data.receivingChainID], true);
	}
}
