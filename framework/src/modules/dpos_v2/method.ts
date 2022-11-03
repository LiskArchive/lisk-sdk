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

import { ImmutableMethodContext } from '../../state_machine';
import { BaseMethod } from '../base_method';
import { MAX_LENGTH_NAME } from './constants';
import { DelegateAccount, DelegateStore } from './stores/delegate';
import { NameStore } from './stores/name';
import { VoterStore } from './stores/voter';
import { VoterData } from './types';
import { isUsername } from './utils';

export class DPoSMethod extends BaseMethod {
	public async isNameAvailable(
		methodContext: ImmutableMethodContext,
		name: string,
	): Promise<boolean> {
		const nameSubStore = this.stores.get(NameStore);
		if (name.length > MAX_LENGTH_NAME || name.length < 1 || !isUsername(name)) {
			return false;
		}

		const isRegistered = await nameSubStore.has(methodContext, Buffer.from(name));
		if (isRegistered) {
			return false;
		}

		return true;
	}

	public async getVoter(
		methodContext: ImmutableMethodContext,
		address: Buffer,
	): Promise<VoterData> {
		const voterSubStore = this.stores.get(VoterStore);
		const voterData = await voterSubStore.get(methodContext, address);

		return voterData;
	}

	public async getDelegate(
		methodContext: ImmutableMethodContext,
		address: Buffer,
	): Promise<DelegateAccount> {
		const delegateSubStore = this.stores.get(DelegateStore);
		const delegate = await delegateSubStore.get(methodContext, address);

		return delegate;
	}
}
