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

import { codec } from '@liskhq/lisk-codec';
import { objects as ObjectUtils } from '@liskhq/lisk-utils';
import { LiskValidationError } from '@liskhq/lisk-validator';
import { AccountKeyAsset, DecodedAsset } from './types';
import {
	isMultisignatureAccount,
	validateKeysSignatures,
	validateSignature,
	verifyMultiSignatureTransaction,
} from './utils';
import { AfterGenesisBlockApplyInput, BaseModule, TransactionApplyInput } from '../base_module';
import { RegisterAssetType } from './register_asset';
import { KeysSchema } from './schemas';

const { bufferArrayOrderByLex, bufferArrayUniqueItems, bufferArrayContainsSome } = ObjectUtils;

export class KeysModule extends BaseModule {
	public name = 'keys';
	public type = 4;
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

	// eslint-disable-next-line class-methods-use-this
	public async beforeTransactionApply({
		stateStore,
		transaction,
	}: TransactionApplyInput): Promise<void> {
		const sender = await stateStore.account.get<AccountKeyAsset>(transaction.senderID);
		const { networkIdentifier } = stateStore.chain;
		const transactionBytes = transaction.getSigningBytes();

		const transactionWithNetworkIdentifierBytes = Buffer.concat([
			networkIdentifier,
			transactionBytes,
		]);

		// This is for registration of multisignature that requires all signatures
		if (transaction.moduleType === this.type && transaction.assetType === RegisterAssetType) {
			const { mandatoryKeys, optionalKeys } = codec.decode<DecodedAsset>(
				KeysSchema,
				transaction.asset,
			);

			// For multisig registration we need all signatures to be present
			const numberOfExpectedKeys = mandatoryKeys.length + optionalKeys.length + 1;
			if (numberOfExpectedKeys !== transaction.signatures.length) {
				throw new Error(
					`There are missing signatures. Expected: ${numberOfExpectedKeys} signatures but got: ${transaction.signatures.length}`,
				);
			}

			// Check if empty signatures are present
			if (!transaction.signatures.every(signature => signature.length > 0)) {
				throw new Error('A signature is required for each registered key.');
			}

			// Verify first signature is from senderPublicKey
			validateSignature(
				transaction.senderPublicKey,
				transaction.signatures[0],
				transactionWithNetworkIdentifierBytes,
				transaction.id,
			);

			// Verify each mandatory key signed in order
			validateKeysSignatures(
				mandatoryKeys,
				transaction.signatures.slice(1, mandatoryKeys.length + 1),
				transactionWithNetworkIdentifierBytes,
				transaction.id,
			);

			// Verify each optional key signed in order
			validateKeysSignatures(
				optionalKeys,
				transaction.signatures.slice(mandatoryKeys.length + 1),
				transactionWithNetworkIdentifierBytes,
				transaction.id,
			);
			return;
		}

		if (!isMultisignatureAccount(sender)) {
			validateSignature(
				transaction.senderPublicKey,
				transaction.signatures[0],
				transactionWithNetworkIdentifierBytes,
				transaction.id,
			);
			return;
		}

		verifyMultiSignatureTransaction(
			transaction.id,
			sender,
			transaction.signatures,
			transactionWithNetworkIdentifierBytes,
		);
	}

	// eslint-disable-next-line class-methods-use-this, @typescript-eslint/require-await
	public async afterGenesisBlockApply({
		genesisBlock,
	}: AfterGenesisBlockApplyInput): Promise<void> {
		const errors = [];
		for (const account of genesisBlock.header.asset.accounts) {
			if (!bufferArrayOrderByLex(account.keys.mandatoryKeys)) {
				errors.push({
					message: 'should be lexicographically ordered',
					keyword: 'mandatoryKeys',
					dataPath: '.accounts[0].keys.mandatoryKeys',
					schemaPath: '#/properties/accounts/items/properties/keys/properties/mandatoryKeys',
					params: { mandatoryKeys: account.keys.mandatoryKeys },
				});
			}

			if (!bufferArrayUniqueItems(account.keys.mandatoryKeys)) {
				errors.push({
					dataPath: '.accounts[0].keys.mandatoryKeys',
					keyword: 'uniqueItems',
					message: 'should NOT have duplicate items',
					params: {},
					schemaPath:
						'#/properties/accounts/items/properties/keys/properties/mandatoryKeys/uniqueItems',
				});
			}

			if (!bufferArrayOrderByLex(account.keys.optionalKeys)) {
				errors.push({
					message: 'should be lexicographically ordered',
					keyword: 'optionalKeys',
					dataPath: '.accounts[0].keys.optionalKeys',
					schemaPath: '#/properties/accounts/items/properties/keys/properties/optionalKeys',
					params: { optionalKeys: account.keys.optionalKeys },
				});
			}

			if (!bufferArrayUniqueItems(account.keys.optionalKeys)) {
				errors.push({
					dataPath: '.accounts[0].keys.optionalKeys',
					keyword: 'uniqueItems',
					message: 'should NOT have duplicate items',
					params: {},
					schemaPath:
						'#/properties/accounts/items/properties/keys/properties/optionalKeys/uniqueItems',
				});
			}

			if (bufferArrayContainsSome(account.keys.mandatoryKeys, account.keys.optionalKeys)) {
				errors.push({
					dataPath: '.accounts[0].keys.mandatoryKeys,.accounts[0].keys.optionalKeys',
					keyword: 'uniqueItems',
					message: 'should NOT have duplicate items among mandatoryKeys and optionalKeys',
					params: {},
					schemaPath: '#/properties/accounts/items/properties/keys',
				});
			}

			if (account.keys.mandatoryKeys.length + account.keys.optionalKeys.length > 64) {
				errors.push({
					dataPath: '.accounts[0].keys.mandatoryKeys,.accounts[0].keys.optionalKeys',
					keyword: 'maxItems',
					message: 'should not have more than 64 keys',
					params: { maxItems: 64 },
					schemaPath: '#/properties/accounts/items/properties/keys',
				});
			}

			if (account.keys.numberOfSignatures < account.keys.mandatoryKeys.length) {
				errors.push({
					dataPath: '.accounts[0].keys.numberOfSignatures',
					keyword: 'min',
					message: 'should be minimum of length of mandatoryKeys',
					params: { min: account.keys.mandatoryKeys.length },
					schemaPath: '#/properties/accounts/items/properties/keys/properties/numberOfSignatures',
				});
			}

			if (
				account.keys.numberOfSignatures >
				account.keys.mandatoryKeys.length + account.keys.optionalKeys.length
			) {
				errors.push({
					dataPath: '.accounts[0].keys.numberOfSignatures',
					keyword: 'max',
					message: 'should be maximum of length of mandatoryKeys and optionalKeys',
					params: {
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
