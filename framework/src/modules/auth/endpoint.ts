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
import { address as cryptoAddress } from '@liskhq/lisk-cryptography';
import { isHexString } from '@liskhq/lisk-validator';
import { ModuleEndpointContext } from '../../types';
import { VerifyStatus } from '../../state_machine';
import { BaseEndpoint } from '../base_endpoint';
import { STORE_PREFIX_AUTH } from './constants';
import { authAccountSchema } from './schemas';
import { AuthAccount, AuthAccountJSON, VerifyEndpointResultJSON } from './types';
import { getTransactionFromParameter, verifyNonce, verifySignatures } from './utils';

export class AuthEndpoint extends BaseEndpoint {
	public async getAuthAccount(context: ModuleEndpointContext): Promise<AuthAccountJSON> {
		const {
			getStore,
			params: { address },
		} = context;

		if (!isHexString(address) || (address as string).length !== 40) {
			throw new Error('Invalid address format.');
		}

		const accountAddress = Buffer.from(address as string, 'hex');
		const store = getStore(this.moduleID, STORE_PREFIX_AUTH);

		try {
			const authAccount = await store.getWithSchema<AuthAccount>(accountAddress, authAccountSchema);

			return {
				nonce: authAccount.nonce.toString(),
				numberOfSignatures: authAccount.numberOfSignatures,
				mandatoryKeys: authAccount.mandatoryKeys.map(key => key.toString('hex')),
				optionalKeys: authAccount.optionalKeys.map(key => key.toString('hex')),
			};
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}

			return { nonce: '0', numberOfSignatures: 0, mandatoryKeys: [], optionalKeys: [] };
		}
	}

	public async isValidSignature(context: ModuleEndpointContext): Promise<VerifyEndpointResultJSON> {
		const {
			getStore,
			params: { transaction: transactionParameter },
			networkIdentifier,
		} = context;

		const transaction = getTransactionFromParameter(transactionParameter);
		const transactionBytes = transaction.getSigningBytes();

		const accountAddress = cryptoAddress.getAddressFromPublicKey(transaction.senderPublicKey);

		const store = getStore(this.moduleID, STORE_PREFIX_AUTH);
		const account = await store.getWithSchema<AuthAccount>(accountAddress, authAccountSchema);

		return verifySignatures(
			this.moduleName,
			transaction,
			transactionBytes,
			networkIdentifier,
			account,
		);
	}

	public async isValidNonce(context: ModuleEndpointContext): Promise<VerifyEndpointResultJSON> {
		const {
			getStore,
			params: { transaction: transactionParameter },
		} = context;

		const transaction = getTransactionFromParameter(transactionParameter);
		const accountAddress = cryptoAddress.getAddressFromPublicKey(transaction.senderPublicKey);

		const store = getStore(this.moduleID, STORE_PREFIX_AUTH);
		const account = await store.getWithSchema<AuthAccount>(accountAddress, authAccountSchema);

		const verificationResult = verifyNonce(transaction, account).status;
		return { verified: verificationResult === VerifyStatus.OK };
	}
}
