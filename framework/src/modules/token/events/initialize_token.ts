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

export interface InitializeTokenEventData {
	tokenID: Buffer;
}

export const initializeTokenEventSchema = {
	$id: '/token/events/initializeTokenEvent',
	type: 'object',
	required: ['tokenID', 'result'],
	properties: {
		tokenID: {
			dataType: 'bytes',
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
			fieldNumber: 1,
		},
		result: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
	},
};

export class InitializeTokenEvent extends BaseEvent<
	InitializeTokenEventData & { result: TokenEventResult }
> {
	public schema = initializeTokenEventSchema;

	public log(ctx: EventQueuer, data: InitializeTokenEventData): void {
		this.add(ctx, { ...data, result: TokenEventResult.SUCCESSFUL }, [data.tokenID]);
	}

	public error(
		ctx: EventQueuer,
		data: InitializeTokenEventData,
		result: TokenErrorEventResult,
	): void {
		this.add(ctx, { ...data, result }, [data.tokenID], true);
	}
}
