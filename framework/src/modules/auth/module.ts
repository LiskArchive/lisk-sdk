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

import { TAG_TRANSACTION } from '@liskhq/lisk-chain';
import { BaseModule } from '..';
import {
	TransactionExecuteContext,
	TransactionVerifyContext,
	VerificationResult,
} from '../../node/state_machine';
import { AuthAPI } from './api';
import { RegisterMultisignatureCommand } from './commands/register_multisignature';
import {
	COMMAND_ID_MULTISIGNATURE_REGISTRATION,
	MODULE_ID_AUTH,
	STORE_PREFIX_AUTH,
} from './constants';
import { AuthEndpoint } from './endpoint';
import { authAccountSchema, configSchema, registerMultisignatureParamsSchema } from './schemas';
import { AuthAccount } from './types';
import {
	isMultisignatureAccount,
	verifyMultiSignatureTransaction,
	verifyNonce,
	verifyRegisterMultiSignatureTransaction,
	verifySingleSignatureTransaction,
} from './utils';

export class AuthModule extends BaseModule {
	public id = MODULE_ID_AUTH;
	public name = 'auth';
	public api = new AuthAPI(this.id);
	public endpoint = new AuthEndpoint(this.id);
	public configSchema = configSchema;
	public commands = [new RegisterMultisignatureCommand(this.id)];

	public async verifyTransaction(context: TransactionVerifyContext): Promise<VerificationResult> {
		const { transaction, networkIdentifier } = context;
		const store = context.getStore(this.id, STORE_PREFIX_AUTH);
		const senderAccount = await store.getWithSchema<AuthAccount>(
			transaction.senderAddress,
			authAccountSchema,
		);

		// Verify nonce of the transaction, it can be FAILED, PENDING or OK
		const nonceStatus = verifyNonce(transaction, senderAccount);

		const transactionBytes = transaction.getSigningBytes();

		// Verify multisignature registration transaction
		if (
			transaction.moduleID === this.id &&
			transaction.commandID === COMMAND_ID_MULTISIGNATURE_REGISTRATION
		) {
			verifyRegisterMultiSignatureTransaction(
				TAG_TRANSACTION,
				registerMultisignatureParamsSchema,
				transaction,
				transactionBytes,
				networkIdentifier,
			);

			return nonceStatus;
		}

		// Verify single signature transaction
		if (!isMultisignatureAccount(senderAccount)) {
			verifySingleSignatureTransaction(
				TAG_TRANSACTION,
				transaction,
				transactionBytes,
				networkIdentifier,
			);

			return nonceStatus;
		}

		// Verify transaction sent from multisignature account
		verifyMultiSignatureTransaction(
			TAG_TRANSACTION,
			networkIdentifier,
			transaction.id,
			senderAccount,
			transaction.signatures,
			transactionBytes,
		);

		return nonceStatus;
	}

	// eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-empty-function
	public async beforeTransactionExecute(_context: TransactionExecuteContext): Promise<void> {}

	// eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-empty-function
	public async afterTransactionExecute(_context: TransactionExecuteContext): Promise<void> {}
}
