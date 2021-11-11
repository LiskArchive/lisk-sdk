/*
 * Copyright © 2021 Lisk Foundation
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

import { NotFoundError } from '@liskhq/lisk-chain';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { JSONObject, ModuleEndpointContext } from '../../types';
import { BaseEndpoint } from '../base_endpoint';
import { STORE_PREFIX_USER } from './constants';
import { getBalanceRequestSchema, UserStoreData, userStoreSchema } from './schemas';

export class TokenEndpoint extends BaseEndpoint {
	public async getBalance(context: ModuleEndpointContext): Promise<JSONObject<UserStoreData>> {
		const errors = validator.validate(getBalanceRequestSchema, context.params);
		if (errors.length) {
			throw new LiskValidationError(errors);
		}
		const address = Buffer.from(context.params.address as string, 'hex');
		const userStore = context.getStore(this.moduleID, STORE_PREFIX_USER);
		try {
			const user = await userStore.getWithSchema<UserStoreData>(address, userStoreSchema);
			return {
				availableBalance: user.availableBalance.toString(),
				lockedBalances: user.lockedBalances.map(b => ({
					amount: b.amount.toString(),
					moduleID: b.moduleID,
				})),
			};
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			return {
				availableBalance: '0',
				lockedBalances: [],
			};
		}
	}
}
