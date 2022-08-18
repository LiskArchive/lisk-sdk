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

import { NotFoundError, TAG_TRANSACTION } from '@liskhq/lisk-chain';
import { objects as objectUtils } from '@liskhq/lisk-utils';
import { codec } from '@liskhq/lisk-codec';
import { validator } from '@liskhq/lisk-validator';
import { BaseModule, ModuleMetadata } from '../base_module';
import {
	GenesisBlockExecuteContext,
	TransactionExecuteContext,
	TransactionVerifyContext,
	VerificationResult,
} from '../../state_machine';
import { AuthAPI } from './api';
import { RegisterMultisignatureCommand } from './commands/register_multisignature';
import { MAX_NUMBER_OF_SIGNATURES, STORE_PREFIX_AUTH } from './constants';
import { AuthEndpoint } from './endpoint';
import {
	authAccountSchema,
	configSchema,
	genesisAuthStoreSchema,
	registerMultisignatureParamsSchema,
} from './schemas';
import { AuthAccount, GenesisAuthStore } from './types';
import {
	isMultisignatureAccount,
	verifyMultiSignatureTransaction,
	verifyNonce,
	verifyRegisterMultiSignatureTransaction,
	verifySingleSignatureTransaction,
} from './utils';

export class AuthModule extends BaseModule {
	public name = 'auth';
	public api = new AuthAPI(this.name);
	public endpoint = new AuthEndpoint(this.name);
	public configSchema = configSchema;
	public commands = [new RegisterMultisignatureCommand(this.id)];

	public metadata(): ModuleMetadata {
		return {
			endpoints: [],
			commands: this.commands.map(command => ({
				id: command.id,
				name: command.name,
				params: command.schema,
			})),
			events: [],
			assets: [
				{
					version: 0,
					data: genesisAuthStoreSchema,
				},
			],
		};
	}

	public async initGenesisState(context: GenesisBlockExecuteContext): Promise<void> {
		const assetBytes = context.assets.getAsset(this.name);
		// if there is no asset, do not initialize
		if (!assetBytes) {
			return;
		}
		const genesisStore = codec.decode<GenesisAuthStore>(genesisAuthStoreSchema, assetBytes);
		const store = context.getStore(this.id, STORE_PREFIX_AUTH);
		const keys = [];
		for (const { storeKey, storeValue } of genesisStore.authDataSubstore) {
			if (storeKey.length !== 20) {
				throw new Error('Invalid store key length for auth module.');
			}
			keys.push(storeKey);

			validator.validate(authAccountSchema, storeValue);

			const { mandatoryKeys, optionalKeys, numberOfSignatures } = storeValue;
			if (mandatoryKeys.length > 0) {
				if (!objectUtils.bufferArrayOrderByLex(mandatoryKeys)) {
					throw new Error(
						'Invalid store value for auth module. MandatoryKeys are not sorted lexicographically.',
					);
				}
				if (!objectUtils.bufferArrayUniqueItems(mandatoryKeys)) {
					throw new Error('Invalid store value for auth module. MandatoryKeys are not unique.');
				}
			}

			if (optionalKeys.length > 0) {
				if (!objectUtils.bufferArrayOrderByLex(optionalKeys)) {
					throw new Error(
						'Invalid store value for auth module. OptionalKeys are not sorted lexicographically.',
					);
				}
				if (!objectUtils.bufferArrayUniqueItems(optionalKeys)) {
					throw new Error('Invalid store value for auth module. OptionalKeys are not unique.');
				}
			}
			if (mandatoryKeys.length + optionalKeys.length > MAX_NUMBER_OF_SIGNATURES) {
				throw new Error(
					`The count of Mandatory and Optional keys should be maximum ${MAX_NUMBER_OF_SIGNATURES}.`,
				);
			}

			const repeatedKeys = mandatoryKeys.filter(
				value => optionalKeys.find(optional => optional.equals(value)) !== undefined,
			);
			if (repeatedKeys.length > 0) {
				throw new Error(
					'Invalid combination of Mandatory and Optional keys. Repeated keys across Mandatory and Optional were found.',
				);
			}

			// Check if key count is less than number of required signatures
			if (mandatoryKeys.length + optionalKeys.length < numberOfSignatures) {
				throw new Error(
					'The numberOfSignatures is bigger than the count of Mandatory and Optional keys.',
				);
			}
			if (mandatoryKeys.length > numberOfSignatures) {
				throw new Error('The numberOfSignatures is smaller than the count of Mandatory keys.');
			}

			await store.setWithSchema(storeKey, storeValue, authAccountSchema);
		}
		if (!objectUtils.bufferArrayUniqueItems(keys)) {
			throw new Error('Duplicate store key for auth module.');
		}
	}

	public async verifyTransaction(context: TransactionVerifyContext): Promise<VerificationResult> {
		const { transaction, networkIdentifier } = context;
		const store = context.getStore(this.id, STORE_PREFIX_AUTH);

		let senderAccount: AuthAccount;

		// First transaction will not have nonce
		try {
			senderAccount = await store.getWithSchema<AuthAccount>(
				transaction.senderAddress,
				authAccountSchema,
			);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			senderAccount = {
				nonce: BigInt(0),
				numberOfSignatures: 0,
				mandatoryKeys: [],
				optionalKeys: [],
			};
		}

		// Verify nonce of the transaction, it can be FAILED, PENDING or OK
		const nonceStatus = verifyNonce(transaction, senderAccount);

		const transactionBytes = transaction.getSigningBytes();

		// Verify multisignature registration transaction
		if (
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			transaction.module === this.name &&
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			transaction.command === this.commands[0].name
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

	public async beforeCommandExecute(context: TransactionExecuteContext): Promise<void> {
		const { senderAddress } = context.transaction;
		const store = context.getStore(this.id, STORE_PREFIX_AUTH);
		const senderExist = await store.has(senderAddress);
		if (!senderExist) {
			await store.setWithSchema(
				senderAddress,
				{
					nonce: BigInt(0),
					numberOfSignatures: 0,
					mandatoryKeys: [],
					optionalKeys: [],
				},
				authAccountSchema,
			);
		}

		const senderAccount = await store.getWithSchema<AuthAccount>(senderAddress, authAccountSchema);
		senderAccount.nonce += BigInt(1);
		await store.setWithSchema(senderAddress, senderAccount, authAccountSchema);
	}

	public async afterCommandExecute(context: TransactionExecuteContext): Promise<void> {
		const address = context.transaction.senderAddress;

		const authStore = context.getStore(this.id, STORE_PREFIX_AUTH);
		const senderAccount = await authStore.getWithSchema<AuthAccount>(address, authAccountSchema);
		senderAccount.nonce += BigInt(1);
		await authStore.setWithSchema(
			address,
			{
				nonce: senderAccount.nonce,
				numberOfSignatures: senderAccount.numberOfSignatures,
				mandatoryKeys: senderAccount.mandatoryKeys,
				optionalKeys: senderAccount.optionalKeys,
			},
			authAccountSchema,
		);
	}
}
