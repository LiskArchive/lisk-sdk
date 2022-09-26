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

export interface MintEventData {
	address: Buffer;
	tokenID: Buffer;
	amount: bigint;
}

export const mintEventSchema = {
	$id: '/token/events/mint',
	type: 'object',
	required: ['address', 'tokenID', 'amount', 'result'],
	properties: {
		address: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 1,
		},
		tokenID: {
			dataType: 'bytes',
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
			fieldNumber: 2,
		},
		amount: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
		result: {
			dataType: 'uint32',
			fieldNumber: 4,
		},
	},
};

export class MintEvent extends BaseEvent<MintEventData & { result: TokenEventResult }> {
	public schema = mintEventSchema;

	public log(ctx: EventQueuer, data: MintEventData): void {
		this.add(ctx, { ...data, result: TokenEventResult.SUCCESSFUL }, [data.address]);
	}

	public error(ctx: EventQueuer, data: MintEventData, result: TokenErrorEventResult): void {
		this.add(ctx, { ...data, result }, [data.address], true);
	}
}
