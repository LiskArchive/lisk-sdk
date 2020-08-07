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
import { AccountKeyAsset, DecodedAsset } from './types';
import {
	isMultisignatureAccount,
	validateKeysSignatures,
	validateSignature,
	verifyMultiSignatureTransaction,
} from './utils';
import { BaseModule, TransactionApplyInput } from '../base_module';
import { RegisterAssetType } from './register_asset';
import { KeysSchema } from './schemas';

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
		transaction: {
			asset,
			assetType,
			getSigningBytes,
			id,
			moduleType,
			senderID,
			senderPublicKey,
			signatures,
		},
	}: TransactionApplyInput): Promise<void> {
		const sender = await stateStore.account.get<AccountKeyAsset>(senderID);
		const { networkIdentifier } = stateStore.chain;
		const transactionBytes = getSigningBytes();

		const transactionWithNetworkIdentifierBytes = Buffer.concat([
			networkIdentifier,
			transactionBytes,
		]);

		// This is for registration of multisignature that requires all signatures
		if (moduleType === this.type && assetType === RegisterAssetType) {
			const decodedAsset = codec.decode(KeysSchema, asset);
			const { mandatoryKeys, optionalKeys } = decodedAsset as DecodedAsset;

			// For multisig registration we need all signatures to be present
			if (mandatoryKeys.length + optionalKeys.length + 1 !== signatures.length) {
				throw new Error('There are missing signatures');
			}

			// Check if empty signatures are present
			if (!signatures.every(signature => signature.length > 0)) {
				throw new Error('A signature is required for each registered key.');
			}

			// Verify first signature is from senderPublicKey
			validateSignature(senderPublicKey, signatures[0], transactionWithNetworkIdentifierBytes, id);

			// Verify each mandatory key signed in order
			validateKeysSignatures(
				mandatoryKeys,
				signatures.slice(1, mandatoryKeys.length + 1),
				transactionWithNetworkIdentifierBytes,
				id,
			);

			// Verify each optional key signed in order
			validateKeysSignatures(
				optionalKeys,
				signatures.slice(mandatoryKeys.length + 1),
				transactionWithNetworkIdentifierBytes,
				id,
			);
			return;
		}

		if (!isMultisignatureAccount(sender)) {
			validateSignature(senderPublicKey, signatures[0], transactionWithNetworkIdentifierBytes, id);
			return;
		}

		verifyMultiSignatureTransaction(id, sender, signatures, transactionWithNetworkIdentifierBytes);
	}
}
