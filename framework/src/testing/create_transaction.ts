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

import { Transaction, TransactionAttrs } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { getAddressAndPublicKeyFromPassphrase } from '@liskhq/lisk-cryptography';
import { signTransaction, validateTransaction } from '@liskhq/lisk-transactions';
import { CommandClass } from './types';

interface CreateTransactionInput {
	moduleID: number;
	commandClass: CommandClass;
	params: Record<string, unknown>;
	nonce?: bigint;
	fee?: bigint;
	passphrase?: string;
	networkIdentifier?: Buffer;
}

export const createTransaction = ({
	moduleID,
	commandClass,
	params,
	nonce,
	fee,
	passphrase,
	networkIdentifier,
}: CreateTransactionInput): Transaction => {
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(passphrase ?? '');
	// eslint-disable-next-line new-cap
	const commandInstance = new commandClass();
	const commandID = commandInstance.id;
	const paramsBytes = codec.encode(commandInstance.schema, params);

	const transaction = {
		moduleID,
		commandID,
		nonce: nonce ?? BigInt(0),
		fee: fee ?? BigInt(0),
		senderPublicKey: publicKey,
		params,
		signatures: [],
	};

	const validationErrors = validateTransaction(commandInstance.schema, transaction);
	if (validationErrors) {
		throw validationErrors;
	}

	if (!passphrase) {
		return new Transaction({ ...transaction, params: paramsBytes });
	}

	if (!networkIdentifier) {
		throw new Error('Network identifier is required to sign a transaction');
	}

	const signedTransaction = signTransaction(
		commandInstance.schema,
		transaction,
		networkIdentifier,
		passphrase,
	);

	// signTransaction returns type Record<string, unknown> so it must be cast to TransactionInput
	return new Transaction({ ...signedTransaction, params: paramsBytes } as TransactionAttrs);
};
