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

import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { TAG_TRANSACTION } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { BaseModule } from '..';
import {
	TransactionExecuteContext,
	TransactionVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../node/state_machine';
import { AuthAPI } from './api';
import { RegisterMultisignatureCommand } from './commands/register_multisignature';
import { MODULE_ID_AUTH, STORE_PREFIX_AUTH } from './constants';
import { AuthEndpoint } from './endpoint';
import { InvalidNonceError } from './errors';
import { authAccountSchema, configSchema, registerMultisignatureParamsSchema } from './schemas';
import { AuthAccount, Keys } from './types';
import {
	isMultisignatureAccount,
	validateKeysSignatures,
	validateSignature,
	verifyMultiSignatureTransaction,
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

		if (transaction.nonce < senderAccount.nonce) {
			return {
				status: VerifyStatus.FAIL,
				error: new InvalidNonceError(
					`Transaction with id:${transaction.id.toString('hex')} nonce is lower than account nonce`,
					transaction.nonce,
					senderAccount.nonce,
				),
			};
		}
		const transactionBytes = transaction.getSigningBytes();

		if (
			transaction.moduleID === this.id &&
			this.commands.find(cmd => cmd.id === transaction.commandID)
		) {
			const { mandatoryKeys, optionalKeys } = codec.decode<Keys>(
				registerMultisignatureParamsSchema,
				transaction.params,
			);

			// For multisig registration we need all signatures to be present (including sender's one that's why we add 1 to the count)
			const numberOfExpectedKeys = mandatoryKeys.length + optionalKeys.length + 1;
			if (numberOfExpectedKeys !== transaction.signatures.length) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error(
						`There are missing signatures. Expected: ${numberOfExpectedKeys} signatures but got: ${transaction.signatures.length}.`,
					),
				};
			}

			// Check if empty signatures are present
			if (!transaction.signatures.every(signature => signature.length > 0)) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('A valid signature is required for each registered key.'),
				};
			}

			try {
				// Verify first signature is from senderPublicKey
				validateSignature(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.senderPublicKey,
					transaction.signatures[0],
					transactionBytes,
					transaction.id,
				);

				// Verify each mandatory key signed in order
				validateKeysSignatures(
					TAG_TRANSACTION,
					networkIdentifier,
					mandatoryKeys,
					transaction.signatures.slice(1, mandatoryKeys.length + 1),
					transactionBytes,
					transaction.id,
				);

				// Verify each optional key signed in order
				validateKeysSignatures(
					TAG_TRANSACTION,
					networkIdentifier,
					optionalKeys,
					transaction.signatures.slice(mandatoryKeys.length + 1),
					transactionBytes,
					transaction.id,
				);
			} catch (error) {
				return {
					status: VerifyStatus.FAIL,
					error: error as Error,
				};
			}

			return {
				status: transaction.nonce > senderAccount.nonce ? VerifyStatus.PENDING : VerifyStatus.OK,
			};
		}

		if (!isMultisignatureAccount(senderAccount)) {
			if (transaction.signatures.length !== 1) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error(
						`Transactions from a single signature account should have exactly one signature. Found ${transaction.signatures.length} signatures.`,
					),
				};
			}
			try {
				validateSignature(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.senderPublicKey,
					transaction.signatures[0],
					transactionBytes,
					transaction.id,
				);
			} catch (error) {
				return {
					status: VerifyStatus.FAIL,
					error: error as Error,
				};
			}

			return {
				status: transaction.nonce > senderAccount.nonce ? VerifyStatus.PENDING : VerifyStatus.OK,
			};
		}

		try {
			verifyMultiSignatureTransaction(
				TAG_TRANSACTION,
				networkIdentifier,
				transaction.id,
				senderAccount,
				transaction.signatures,
				transactionBytes,
			);
		} catch (error) {
			return {
				status: VerifyStatus.FAIL,
				error: error as Error,
			};
		}

		return {
			status: transaction.nonce > senderAccount.nonce ? VerifyStatus.PENDING : VerifyStatus.OK,
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-empty-function
	public async beforeTransactionExecute(_context: TransactionExecuteContext): Promise<void> {}

	// eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-empty-function
	public async afterTransactionExecute(_context: TransactionExecuteContext): Promise<void> {}
}
