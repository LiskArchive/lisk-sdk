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
import { AuthMethod } from './method';
import { RegisterMultisignatureGroupCommand } from './commands/register_multisignature';
import { MAX_NUMBER_OF_SIGNATURES } from './constants';
import { AuthEndpoint } from './endpoint';
import { configSchema, genesisAuthStoreSchema } from './schemas';
import { GenesisAuthStore, ImmutableStoreCallback } from './types';
import { verifyNonce, verifySignatures } from './utils';
import { AuthAccount, authAccountSchema, AuthAccountStore } from './stores/auth_account';

export class AuthModule extends BaseModule {
	public method = new AuthMethod(this.stores, this.events);
	public endpoint = new AuthEndpoint(this.name, this.stores, this.offchainStores);
	public configSchema = configSchema;
	public commands = [new RegisterMultisignatureGroupCommand(this.stores, this.events)];

	public constructor() {
		super();
		this.stores.register(AuthAccountStore, new AuthAccountStore(this.name));
	}

	public metadata(): ModuleMetadata {
		return {
			endpoints: [],
			commands: this.commands.map(command => ({
				name: command.name,
				params: command.schema,
			})),
			events: this.events.values().map(v => ({
				name: v.name,
				data: v.schema,
			})),
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
		const store = this.stores.get(AuthAccountStore);
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

			await store.set(context, storeKey, storeValue);
		}
		if (!objectUtils.bufferArrayUniqueItems(keys)) {
			throw new Error('Duplicate store key for auth module.');
		}
	}

	public async verifyTransaction(context: TransactionVerifyContext): Promise<VerificationResult> {
		const { transaction, chainID } = context;
		const store = this.stores.get(AuthAccountStore);

		let senderAccount: AuthAccount;

		// First transaction will not have nonce
		try {
			senderAccount = await store.get(context, transaction.senderAddress);
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

		verifySignatures(this.name, transaction, transaction.getSigningBytes(), chainID, senderAccount);

		return nonceStatus;
	}

	public async beforeCommandExecute(context: TransactionExecuteContext): Promise<void> {
		const { transaction } = context;
		const store = this.stores.get(AuthAccountStore);
		const senderExist = await store.has(context, transaction.senderAddress);
		if (!senderExist) {
			await store.set(context, context.transaction.senderAddress, {
				nonce: BigInt(0),
				numberOfSignatures: 0,
				mandatoryKeys: [],
				optionalKeys: [],
			});
		}

		const senderAccount = await store.get(context, transaction.senderAddress);
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

	// TODO: Changed it to private once implemented
	protected async _isMultisignatureAccount(
		getStore: ImmutableStoreCallback,
		address: Buffer,
	): Promise<boolean> {
		const authSubstore = getStore(this.id, STORE_PREFIX_AUTH);
		try {
			const authAccount = await authSubstore.getWithSchema<AuthAccount>(address, authAccountSchema);

			if (authAccount.numberOfSignatures === 0) {
				return false;
			}

			return true;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}

		await store.set(context, transaction.senderAddress, senderAccount);
	}
}
