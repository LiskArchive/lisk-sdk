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

import { ImmutableAPIContext } from '../../node/state_machine';
import { BaseAPI } from '../base_api';
import {
	MAX_LENGTH_NAME,
	STORE_PREFIX_DELEGATE,
	STORE_PREFIX_NAME,
	STORE_PREFIX_VOTER,
} from './constants';
import { voterStoreSchema, delegateStoreSchema } from './schemas';
import { DelegateAccount, VoterData } from './types';

export class DPoSAPI extends BaseAPI {
	public async isNameAvailable(apiContext: ImmutableAPIContext, name: string): Promise<boolean> {
		const nameSubStore = apiContext.getStore(this.moduleID, STORE_PREFIX_NAME);
		const regex = /^[a-z=0-9!@$&_.]*$/;
		if (
			(await nameSubStore.has(Buffer.from(name))) ||
			name.length > MAX_LENGTH_NAME ||
			name.length < 1 ||
			!regex.test(name)
		) {
			return false;
		}

		return true;
	}

	public async getVoter(apiContext: ImmutableAPIContext, address: Buffer): Promise<VoterData> {
		const voterSubStore = apiContext.getStore(this.moduleID, STORE_PREFIX_VOTER);
		const voterData = await voterSubStore.getWithSchema<VoterData>(address, voterStoreSchema);

		return voterData;
	}

	public async getDelegate(
		apiContext: ImmutableAPIContext,
		address: Buffer,
	): Promise<DelegateAccount> {
		const delegateSubStore = apiContext.getStore(this.moduleID, STORE_PREFIX_DELEGATE);
		const delegate = await delegateSubStore.getWithSchema<DelegateAccount>(
			address,
			delegateStoreSchema,
		);

		return delegate;
	}
}
