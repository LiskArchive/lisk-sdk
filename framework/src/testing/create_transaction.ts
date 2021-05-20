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
 *
 */

import { Transaction, TransactionInput } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { getAddressAndPublicKeyFromPassphrase } from '@liskhq/lisk-cryptography';
import { signTransaction, validateTransaction } from '@liskhq/lisk-transactions';
import { AssetClass } from './types';

interface CreateTransactionInput {
	moduleID: number;
	assetClass: AssetClass;
	asset: Record<string, unknown>;
	nonce?: bigint;
	fee?: bigint;
	passphrase?: string;
	networkIdentifier?: Buffer;
}

export const createTransaction = ({
	moduleID,
	assetClass,
	asset,
	nonce,
	fee,
	passphrase,
	networkIdentifier,
}: CreateTransactionInput): Transaction => {
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(passphrase ?? '');
	// eslint-disable-next-line new-cap
	const assetInstance = new assetClass();
	const assetID = assetInstance.id;
	const assetBytes = codec.encode(assetInstance.schema, asset);

	const transaction = {
		moduleID,
		assetID,
		nonce: nonce ?? BigInt(0),
		fee: fee ?? BigInt(0),
		senderPublicKey: publicKey,
		asset,
		signatures: [],
	};

	const validationErrors = validateTransaction(assetInstance.schema, transaction);
	if (validationErrors) {
		throw validationErrors;
	}

	if (!passphrase) {
		return new Transaction({ ...transaction, asset: assetBytes });
	}

	if (!networkIdentifier) {
		throw new Error('Network identifier is required to sign a transaction');
	}

	const signedTransaction = signTransaction(
		assetInstance.schema,
		transaction,
		networkIdentifier,
		passphrase,
	);

	// signTransaction returns type Record<string, unknown> so it must be cast to TransactionInput
	return new Transaction({ ...signedTransaction, asset: assetBytes } as TransactionInput);
};
