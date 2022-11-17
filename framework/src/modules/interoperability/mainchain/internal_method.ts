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

import { BaseInteroperabilityInternalMethod } from '../base_interoperability_internal_methods';
import { EMPTY_BYTES, LIVENESS_LIMIT } from '../constants';
import { OwnChainAccountStore } from '../stores/own_chain_account';
import { ChainAccountStore, ChainStatus } from '../stores/chain_account';
import { ImmutableStoreGetter } from '../../base_store';
import { NotFoundError } from '../../../state_machine';

export class MainchainInteroperabilityInternalMethod extends BaseInteroperabilityInternalMethod {
	public async isLive(
		context: ImmutableStoreGetter,
		chainID: Buffer,
		timestamp: number,
	): Promise<boolean> {
		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(context, EMPTY_BYTES);
		if (chainID.equals(ownChainAccount.chainID)) {
			return true;
		}

		try {
			const chainAccount = await this.stores.get(ChainAccountStore).get(context, chainID);
			if (chainAccount.status === ChainStatus.TERMINATED) {
				return false;
			}
			if (chainAccount.status === ChainStatus.ACTIVE) {
				if (timestamp - chainAccount.lastCertificate.timestamp > LIVENESS_LIMIT) {
					return false;
				}
			}

			return true;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			return false;
		}
	}
}
