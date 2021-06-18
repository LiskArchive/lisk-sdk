/*
 * Copyright © 2020 Lisk Foundation
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
import { codec } from '@liskhq/lisk-codec';
import { objects as ObjectUtils } from '@liskhq/lisk-utils';
import { LiskValidationError } from '@liskhq/lisk-validator';
import { AccountKeys, DecodedAsset } from './types';
import {
	isMultisignatureAccount,
	validateKeysSignatures,
	validateSignature,
	verifyMultiSignatureTransaction,
} from './utils';
import { BaseModule } from '../base_module';
import { AfterGenesisBlockApplyContext, TransactionApplyContext } from '../../types';
import { RegisterAssetID, RegisterAsset } from './register_asset';
import { keysSchema } from './schemas';

const { bufferArrayOrderByLex, bufferArrayUniqueItems, bufferArrayContainsSome } = ObjectUtils;

export class KeysModule extends BaseModule {
	public name = 'keys';
	public id = 4;
	public accountSchema = {
		type: 'object',
		properties: {
			numberOfSignatures: { dataType: 'uint32', fieldNumber: 1 },
			mandatoryKeys: {
				type: 'array',
				items: { dataType: 'bytes' },
				fieldNumber: 2,
			},
			optionalKeys: {
				type: 'array',
				items: { dataType: 'bytes' },
				fieldNumber: 3,
			},
		},
		default: {
			mandatoryKeys: [],
			optionalKeys: [],
			numberOfSignatures: 0,
		},
	};

	public readonly transactionAssets = [new RegisterAsset()];

	public async beforeTransactionApply({
		stateStore,
		transaction,
	}: TransactionApplyContext): Promise<void> {
		const sender = await stateStore.account.get<AccountKeys>(transaction.senderAddress);
		const { networkIdentifier } = stateStore.chain;
		const transactionBytes = transaction.getSigningBytes();

		// This is for registration of multisignature that requires all signatures
		if (transaction.moduleID === this.id && transaction.assetID === RegisterAssetID) {
			const { mandatoryKeys, optionalKeys } = codec.decode<DecodedAsset>(
				keysSchema,
				transaction.asset,
			);

			// For multisig registration we need all signatures to be present (including sender's one that's why we add 1 to the count)
			const numberOfExpectedKeys = mandatoryKeys.length + optionalKeys.length + 1;
			if (numberOfExpectedKeys !== transaction.signatures.length) {
				throw new Error(
					`There are missing signatures. Expected: ${numberOfExpectedKeys} signatures but got: ${transaction.signatures.length}.`,
				);
			}

			// Check if empty signatures are present
			if (!transaction.signatures.every(signature => signature.length > 0)) {
				throw new Error('A valid signature is required for each registered key.');
			}

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
			return;
		}

		if (!isMultisignatureAccount(sender)) {
			if (transaction.signatures.length !== 1) {
				throw new Error(
					`Transactions from a single signature account should have exactly one signature. Found ${transaction.signatures.length} signatures.`,
				);
			}
			validateSignature(
				TAG_TRANSACTION,
				networkIdentifier,
				transaction.senderPublicKey,
				transaction.signatures[0],
				transactionBytes,
				transaction.id,
			);
			return;
		}

		verifyMultiSignatureTransaction(
			TAG_TRANSACTION,
			networkIdentifier,
			transaction.id,
			sender,
			transaction.signatures,
			transactionBytes,
		);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async afterGenesisBlockApply({
		genesisBlock,
	}: AfterGenesisBlockApplyContext<AccountKeys>): Promise<void> {
		const errors = [];
		const accountsLength = genesisBlock.header.asset.accounts.length;

		for (let index = 0; index < accountsLength; index += 1) {
			const account = genesisBlock.header.asset.accounts[index];

			if (!bufferArrayOrderByLex(account.keys.mandatoryKeys)) {
				errors.push({
					message: 'should be lexicographically ordered',
					keyword: 'mandatoryKeys',
					dataPath: `.accounts[${index}].keys.mandatoryKeys`,
					schemaPath: '#/properties/accounts/items/properties/keys/properties/mandatoryKeys',
					params: { keys: account.keys, address: account.address },
				});
			}

			if (!bufferArrayUniqueItems(account.keys.mandatoryKeys)) {
				errors.push({
					dataPath: `.accounts[${index}].keys.mandatoryKeys`,
					keyword: 'uniqueItems',
					message: 'must NOT have duplicate items',
					params: { keys: account.keys, address: account.address },
					schemaPath:
						'#/properties/accounts/items/properties/keys/properties/mandatoryKeys/uniqueItems',
				});
			}

			if (!bufferArrayOrderByLex(account.keys.optionalKeys)) {
				errors.push({
					message: 'should be lexicographically ordered',
					keyword: 'optionalKeys',
					dataPath: `.accounts[${index}].keys.optionalKeys`,
					schemaPath: '#/properties/accounts/items/properties/keys/properties/optionalKeys',
					params: { keys: account.keys, address: account.address },
				});
			}

			if (!bufferArrayUniqueItems(account.keys.optionalKeys)) {
				errors.push({
					dataPath: `.accounts[${index}].keys.optionalKeys`,
					keyword: 'uniqueItems',
					message: 'must NOT have duplicate items',
					params: { keys: account.keys, address: account.address },
					schemaPath:
						'#/properties/accounts/items/properties/keys/properties/optionalKeys/uniqueItems',
				});
			}

			if (bufferArrayContainsSome(account.keys.mandatoryKeys, account.keys.optionalKeys)) {
				errors.push({
					dataPath: `.accounts[${index}].keys.mandatoryKeys, .accounts[${index}].keys.optionalKeys`,
					keyword: 'uniqueItems',
					message: 'must NOT have duplicate items among mandatoryKeys and optionalKeys',
					params: { keys: account.keys, address: account.address },
					schemaPath: '#/properties/accounts/items/properties/keys',
				});
			}

			if (account.keys.mandatoryKeys.length + account.keys.optionalKeys.length > 64) {
				errors.push({
					dataPath: `.accounts[${index}].keys.mandatoryKeys, .accounts[${index}].keys.optionalKeys`,
					keyword: 'maxItems',
					message: 'should not have more than 64 keys',
					params: { keys: account.keys, address: account.address, maxItems: 64 },
					schemaPath: '#/properties/accounts/items/properties/keys',
				});
			}

			if (account.keys.numberOfSignatures < account.keys.mandatoryKeys.length) {
				errors.push({
					dataPath: `.accounts[${index}].keys.numberOfSignatures`,
					keyword: 'min',
					message: 'should be minimum of length of mandatoryKeys',
					params: {
						keys: account.keys,
						address: account.address,
						min: account.keys.mandatoryKeys.length,
					},
					schemaPath: '#/properties/accounts/items/properties/keys/properties/numberOfSignatures',
				});
			}

			if (
				account.keys.numberOfSignatures >
				account.keys.mandatoryKeys.length + account.keys.optionalKeys.length
			) {
				errors.push({
					dataPath: `.accounts[${index}].keys.numberOfSignatures`,
					keyword: 'max',
					message: 'should be maximum of length of mandatoryKeys and optionalKeys',
					params: {
						keys: account.keys,
						address: account.address,
						max: account.keys.mandatoryKeys.length + account.keys.optionalKeys.length,
					},
					schemaPath: '#/properties/accounts/items/properties/keys/properties/numberOfSignatures',
				});
			}
		}

		if (errors.length) {
			throw new LiskValidationError(errors);
		}
	}
}
