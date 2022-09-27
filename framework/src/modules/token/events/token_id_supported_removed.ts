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
import { TOKEN_ID_LENGTH } from '../constants';

export interface TokenIDSupportRemovedEventData {
	tokenID: Buffer;
}

export const tokenIDSupportRemovedEventSchema = {
	$id: '/token/events/tokenIDSupportRemoved',
	type: 'object',
	required: ['tokenID'],
	properties: {
		tokenID: {
			dataType: 'bytes',
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
			fieldNumber: 1,
		},
	},
};

export class TokenIDSupportRemovedEvent extends BaseEvent<TokenIDSupportRemovedEventData> {
	public schema = tokenIDSupportRemovedEventSchema;

	public log(ctx: EventQueuer, tokenID: Buffer): void {
		this.add(ctx, { tokenID }, [tokenID]);
	}
}
