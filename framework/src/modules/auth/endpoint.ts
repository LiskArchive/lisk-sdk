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

import { TAG_TRANSACTION, NotFoundError } from '@liskhq/lisk-chain';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { isHexString } from '@liskhq/lisk-validator';
import { ModuleEndpointContext } from '../../types';
import { VerifyStatus } from '../../state_machine';
import { BaseEndpoint } from '../base_endpoint';
import { COMMAND_ID_DELEGATE_REGISTRATION } from '../dpos_v2/constants';
import { MODULE_ID_AUTH, STORE_PREFIX_AUTH } from './constants';
import { authAccountSchema, registerMultisignatureParamsSchema } from './schemas';
import { AuthAccount, AuthAccountJSON, VerifyEndpointResultJSON } from './types';
import {
	getTransactionFromParameter,
	isMultisignatureAccount,
	verifyMultiSignatureTransaction,
	verifyNonce,
	verifyRegisterMultiSignatureTransaction,
	verifySingleSignatureTransaction,
} from './utils';

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
		const store = getStore(MODULE_ID_AUTH, STORE_PREFIX_AUTH);

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
	public async verifySignatures(context: ModuleEndpointContext): Promise<VerifyEndpointResultJSON> {
		const {
			getStore,
			params: { transaction: transactionParameter },
			networkIdentifier,
		} = context;

		const transaction = getTransactionFromParameter(transactionParameter);

		const { senderPublicKey, signatures } = transaction;

		const accountAddress = getAddressFromPublicKey(senderPublicKey);

		const store = getStore(MODULE_ID_AUTH, STORE_PREFIX_AUTH);
		const account = await store.getWithSchema<AuthAccount>(accountAddress, authAccountSchema);

		const transactionBytes = transaction.getSigningBytes();

		if (
			transaction.moduleID === this.moduleID &&
			transaction.commandID === COMMAND_ID_DELEGATE_REGISTRATION
		) {
			verifyRegisterMultiSignatureTransaction(
				TAG_TRANSACTION,
				registerMultisignatureParamsSchema,
				transaction,
				transactionBytes,
				networkIdentifier,
			);

			return { verified: true };
		}

		// Verify multisignature registration transaction
		if (!isMultisignatureAccount(account)) {
			verifySingleSignatureTransaction(
				TAG_TRANSACTION,
				transaction,
				transactionBytes,
				networkIdentifier,
			);
			return { verified: true };
		}

		verifyMultiSignatureTransaction(
			TAG_TRANSACTION,
			networkIdentifier,
			transaction.id,
			account,
			signatures,
			transactionBytes,
		);
		return { verified: true };
	}

	public async verifyNonce(context: ModuleEndpointContext): Promise<VerifyEndpointResultJSON> {
		const {
			getStore,
			params: { transaction: transactionParameter },
		} = context;

		const transaction = getTransactionFromParameter(transactionParameter);

		const { senderPublicKey } = transaction;

		const accountAddress = getAddressFromPublicKey(senderPublicKey);

		const store = getStore(MODULE_ID_AUTH, STORE_PREFIX_AUTH);
		const account = await store.getWithSchema<AuthAccount>(accountAddress, authAccountSchema);

		const verificationResult = verifyNonce(transaction, account).status;

		if (verificationResult === VerifyStatus.OK) {
			return { verified: true };
		}
		return { verified: false };
	}
}
