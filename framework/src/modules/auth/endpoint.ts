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
import { ModuleEndpointContext } from '../../types';
import { VerifyStatus } from '../../state_machine';
import { BaseEndpoint } from '../base_endpoint';
import { AuthAccountJSON, VerifyEndpointResultJSON } from './types';
import { getTransactionFromParameter, verifyNonceStrict, verifySignatures } from './utils';
import { AuthAccountStore } from './stores/auth_account';
import { NamedRegistry } from '../named_registry';

export class AuthEndpoint extends BaseEndpoint {
	private readonly _moduleName: string;

	public constructor(moduleName: string, stores: NamedRegistry, offchainStores: NamedRegistry) {
		super(stores, offchainStores);
		this._moduleName = moduleName;
	}

	public async getAuthAccount(context: ModuleEndpointContext): Promise<AuthAccountJSON> {
		const {
			params: { address },
		} = context;

		if (typeof address !== 'string') {
			throw new Error('Invalid address format.');
		}
		cryptoAddress.validateLisk32Address(address);

		const accountAddress = cryptoAddress.getAddressFromLisk32Address(address);
		const store = this.stores.get(AuthAccountStore);

		try {
			const authAccount = await store.get(context, accountAddress);

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
			params: { transaction: transactionParameter },
			networkIdentifier,
		} = context;

		const transaction = getTransactionFromParameter(transactionParameter);
		const transactionBytes = transaction.getSigningBytes();

		const accountAddress = cryptoAddress.getAddressFromPublicKey(transaction.senderPublicKey);

		const store = this.stores.get(AuthAccountStore);
		const account = await store.get(context, accountAddress);

		return verifySignatures(
			this._moduleName,
			transaction,
			transactionBytes,
			networkIdentifier,
			account,
		);
	}

	public async isValidNonce(context: ModuleEndpointContext): Promise<VerifyEndpointResultJSON> {
		const {
			params: { transaction: transactionParameter },
		} = context;

		const transaction = getTransactionFromParameter(transactionParameter);
		const accountAddress = cryptoAddress.getAddressFromPublicKey(transaction.senderPublicKey);

		const store = this.stores.get(AuthAccountStore);
		const account = await store.get(context, accountAddress);

		const verificationResult = verifyNonceStrict(transaction, account).status;
		return { verified: verificationResult === VerifyStatus.OK };
	}
}
