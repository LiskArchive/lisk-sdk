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

import { SidechainInteroperabilityInternalMethod } from './internal_method';
import { BaseInteroperabilityMethod } from '../base_interoperability_method';
import { ImmutableMethodContext } from '../../../state_machine';
import { getMainchainID } from '../utils';
import { ChainAccountStore, ChainStatus } from '../stores/chain_account';
import { TerminatedStateStore } from '../stores/terminated_state';

export class SidechainInteroperabilityMethod extends BaseInteroperabilityMethod<SidechainInteroperabilityInternalMethod> {
	public async isChannelActive(context: ImmutableMethodContext, chainID: Buffer): Promise<boolean> {
		const ownChainAccount = await this.getOwnChainAccount(context);

		// We do not consider the channel active if it is the own chain.
		if (chainID.equals(ownChainAccount.chainID)) {
			return false;
		}

		const chainAccountStore = this.stores.get(ChainAccountStore);
		const chainAccountExists = await chainAccountStore.has(context, chainID);
		// Account may not exist on a sidechain.
		if (chainAccountExists) {
			const chainAccount = await chainAccountStore.get(context, chainID);
			return chainAccount.status === ChainStatus.ACTIVE;
		}

		// Check that mainchain account exists.
		const mainchainID = getMainchainID(chainID);
		if (!(await chainAccountStore.has(context, mainchainID))) {
			return false;
		}

		const mainchainAccount = await chainAccountStore.get(context, mainchainID);

		// Check if chain status is active.
		if (mainchainAccount.status !== ChainStatus.ACTIVE) {
			return false;
		}

		// Check that the chain has not been terminated.
		// This could be the case if the chain is not the partner chain.
		const terminatedStateExists = await this.stores.get(TerminatedStateStore).has(context, chainID);
		if (terminatedStateExists) {
			return false;
		}
		return true;
	}
}
