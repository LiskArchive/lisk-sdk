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

import { Transaction } from '@liskhq/lisk-chain';
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
	const assetBytes = codec.encode(assetInstance.schema, asset);

	const transaction = new Transaction({
		moduleID,
		assetID: assetInstance.id,
		nonce: nonce ?? BigInt(0),
		fee: fee ?? BigInt(0),
		senderPublicKey: publicKey,
		asset: assetBytes,
		signatures: [],
	});

	const validationErrors = validateTransaction(assetInstance.schema, { ...transaction, asset });
	if (validationErrors) {
		throw validationErrors;
	}

	if (!passphrase) {
		return transaction;
	}

	return (signTransaction(
		assetInstance.schema,
		{ ...transaction, asset },
		networkIdentifier ?? Buffer.alloc(1),
		passphrase,
	) as unknown) as Transaction;
};
