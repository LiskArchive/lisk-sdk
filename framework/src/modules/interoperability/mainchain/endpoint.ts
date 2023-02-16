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

import { codec } from '@liskhq/lisk-codec';
import { validator } from '@liskhq/lisk-validator';
import { BaseInteroperabilityEndpoint } from '../base_interoperability_endpoint';
import { CHAIN_REGISTRATION_FEE, MIN_RETURN_FEE_PER_BYTE_LSK } from '../constants';
import { CrossChainMessageContext } from '../types';
import { getCCMSize } from '../utils';
import { UserStore } from '../../token/stores/user';
import { CCTransferMessageParams, crossChainTransferMessageParams } from '../../token/schemas';
import { USER_SUBSTORE_INITIALIZATION_FEE } from '../../token/constants';

export class MainchainInteroperabilityEndpoint extends BaseInteroperabilityEndpoint {
	public getRegistrationFee(): { fee: string } {
		return { fee: CHAIN_REGISTRATION_FEE.toString() };
	}

	public async getMinimumMessageFee(context: CrossChainMessageContext): Promise<{ fee: string }> {
		const { ccm } = context;

		let additionalFee = BigInt(0);

		// Check if user account has to be initialized
		try {
			const params = codec.decode<CCTransferMessageParams>(
				crossChainTransferMessageParams,
				ccm.params,
			);
			validator.validate(crossChainTransferMessageParams, params);
			const { tokenID, recipientAddress } = params;
			const userStore = this.stores.get(UserStore);
			const userExist = await userStore.has(context, userStore.getKey(recipientAddress, tokenID));
			if (!userExist) {
				additionalFee += USER_SUBSTORE_INITIALIZATION_FEE;
			}
		} catch (err) {
			// Not a Transfer Transaction, no problem
		}

		return {
			fee: (getCCMSize(ccm) * MIN_RETURN_FEE_PER_BYTE_LSK + additionalFee).toString(),
		};
	}
}
