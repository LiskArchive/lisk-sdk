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

import { ImmutableStoreGetter } from '../../base_store';
import { BaseInteroperabilityInternalMethod } from '../base_interoperability_internal_methods';
import { ChainAccountStore, ChainStatus } from '../stores/chain_account';
import { TerminatedStateStore } from '../stores/terminated_state';

export class SidechainInteroperabilityInternalMethod extends BaseInteroperabilityInternalMethod {
	public async isLive(context: ImmutableStoreGetter, chainID: Buffer): Promise<boolean> {
		const chainAccountExists = await this.stores.get(ChainAccountStore).has(context, chainID);
		if (chainAccountExists) {
			const chainAccount = await this.stores.get(ChainAccountStore).get(context, chainID);
			if (chainAccount.status === ChainStatus.TERMINATED) {
				return false;
			}
		}

		const isTerminated = await this.stores.get(TerminatedStateStore).has(context, chainID);
		if (isTerminated) {
			return false;
		}

		return true;
	}
}
