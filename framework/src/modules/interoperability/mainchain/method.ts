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

import { MainchainInteroperabilityInternalMethod } from './internal_method';
import { BaseInteroperabilityMethod } from '../base_interoperability_method';
import { ImmutableMethodContext } from '../../../state_machine';
import { ChainAccountStore, ChainStatus } from '../stores/chain_account';

export class MainchainInteroperabilityMethod extends BaseInteroperabilityMethod<MainchainInteroperabilityInternalMethod> {
	public async isChannelActive(
		context: ImmutableMethodContext,
		chainID: Buffer,
		timestamp: number,
	): Promise<boolean> {
		const ownChainAccount = await this.getOwnChainAccount(context);

		// We do not consider the channel active if it is the own chain.
		if (chainID.equals(ownChainAccount.chainID)) {
			return false;
		}

		const chainAccount = await this.stores.get(ChainAccountStore).get(context, chainID);

		return (
			(await this.internalMethod.isLive(context, chainID, timestamp)) &&
			chainAccount.status === ChainStatus.ACTIVE
		);
	}
}
