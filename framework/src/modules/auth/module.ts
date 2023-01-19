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

import { objects as objectUtils } from '@liskhq/lisk-utils';
import { codec } from '@liskhq/lisk-codec';
import { validator } from '@liskhq/lisk-validator';
import { BaseModule, ModuleMetadata } from '../base_module';
import {
	GenesisBlockExecuteContext,
	TransactionExecuteContext,
	TransactionVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../state_machine';
import { AuthMethod } from './method';
import { MAX_NUMBER_OF_SIGNATURES } from './constants';
import { AuthEndpoint } from './endpoint';
import {
	addressRequestSchema,
	configSchema,
	genesisAuthStoreSchema,
	multisigRegMsgSchema,
	sortMultisignatureGroupResponseSchema,
	sortMultisignatureGroupRequestSchema,
	transactionRequestSchema,
	verifyResultSchema,
} from './schemas';
import { GenesisAuthStore } from './types';
import { verifyNonce, verifySignatures } from './utils';
import { authAccountSchema, AuthAccountStore } from './stores/auth_account';
import { MultisignatureRegistrationEvent } from './events/multisignature_registration';
import { RegisterMultisignatureCommand } from './commands/register_multisignature';
import { InvalidSignatureEvent } from './events/invalid_signature';
import { InvalidNonceError } from './errors';

export class AuthModule extends BaseModule {
	public method = new AuthMethod(this.stores, this.events);
	public endpoint = new AuthEndpoint(this.name, this.stores, this.offchainStores);
	public configSchema = configSchema;
	public commands = [new RegisterMultisignatureCommand(this.stores, this.events)];

	public constructor() {
		super();
		this.stores.register(AuthAccountStore, new AuthAccountStore(this.name));
		this.events.register(
			MultisignatureRegistrationEvent,
			new MultisignatureRegistrationEvent(this.name),
		);
		this.events.register(InvalidSignatureEvent, new InvalidSignatureEvent(this.name));
	}

	public metadata(): ModuleMetadata {
		return {
			...this.baseMetadata(),
			endpoints: [
				{
					name: this.endpoint.getAuthAccount.name,
					request: addressRequestSchema,
					response: authAccountSchema,
				},
				{
					name: this.endpoint.isValidNonce.name,
					request: transactionRequestSchema,
					response: verifyResultSchema,
				},
				{
					name: this.endpoint.isValidSignature.name,
					request: transactionRequestSchema,
					response: verifyResultSchema,
				},
				{
					name: this.endpoint.getMultiSigRegMsgSchema.name,
					response: multisigRegMsgSchema,
				},
				{
					name: this.endpoint.sortMultisignatureGroup.name,
					request: sortMultisignatureGroupRequestSchema,
					response: sortMultisignatureGroupResponseSchema,
				},
			],
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
		const authAccountStore = this.stores.get(AuthAccountStore);
		const senderAccount = await authAccountStore.getOrDefault(context, transaction.senderAddress);

		// Verify nonce of the transaction, it can be FAILED, PENDING or OK
		const nonceStatus = verifyNonce(transaction, senderAccount);

		if (nonceStatus.status === VerifyStatus.FAIL) {
			throw new InvalidNonceError(
				`Transaction with id:${transaction.id.toString('hex')} nonce is lower than account nonce.`,
				transaction.nonce,
				senderAccount.nonce,
			);
		}

		verifySignatures(transaction, chainID, senderAccount);

		return nonceStatus;
	}

	public async beforeCommandExecute(context: TransactionExecuteContext): Promise<void> {
		const { transaction } = context;
		const authAccountStore = this.stores.get(AuthAccountStore);

		const senderAccount = await authAccountStore.getOrDefault(context, transaction.senderAddress);

		await authAccountStore.set(context, transaction.senderAddress, {
			nonce: senderAccount.nonce + BigInt(1),
			numberOfSignatures: senderAccount.numberOfSignatures,
			mandatoryKeys: senderAccount.mandatoryKeys,
			optionalKeys: senderAccount.optionalKeys,
		});
	}
}
