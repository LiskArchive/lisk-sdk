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

export interface InitializeEscrowAccountEventData {
	chainID: Buffer;
	tokenID: Buffer;
	initializationFee: bigint;
}

export const initializeEscrowAccountEventSchema = {
	$id: '/token/events/initializeEscrowAccount',
	type: 'object',
	required: ['chainID', 'tokenID', 'initializationFee', 'result'],
	properties: {
		chainID: {
			dataType: 'bytes',
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
			fieldNumber: 1,
		},
		tokenID: {
			dataType: 'bytes',
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
			fieldNumber: 2,
		},
		initializationFee: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
		result: {
			dataType: 'uint32',
			fieldNumber: 4,
		},
	},
};

export class InitializeEscrowAccountEvent extends BaseEvent<
	InitializeEscrowAccountEventData & { result: TokenEventResult }
> {
	public schema = initializeEscrowAccountEventSchema;

	public log(ctx: EventQueuer, data: InitializeEscrowAccountEventData): void {
		this.add(ctx, { ...data, result: TokenEventResult.SUCCESSFUL }, [data.chainID]);
	}

	public error(
		ctx: EventQueuer,
		data: InitializeEscrowAccountEventData,
		result: TokenErrorEventResult,
	): void {
		this.add(ctx, { ...data, result }, [data.chainID], true);
	}
}
