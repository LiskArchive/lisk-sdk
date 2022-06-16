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
import { getAddressAndPublicKeyFromPassphrase, getKeys } from '@liskhq/lisk-cryptography';
import { validateTransaction } from '@liskhq/lisk-transactions';
import { CommandClass } from './types';

interface CreateTransactionInput {
	moduleID: number;
	commandClass: CommandClass;
	params: Record<string, unknown> | undefined;
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
	const paramsBytes =
		commandInstance.schema && params
			? codec.encode(commandInstance.schema, params)
			: Buffer.alloc(0);

	const transaction = {
		moduleID,
		commandID,
		nonce: nonce ?? BigInt(0),
		fee: fee ?? BigInt(0),
		senderPublicKey: publicKey,
		params,
		signatures: [],
	};

	if (commandInstance.schema) {
		const validationErrors = validateTransaction(transaction, commandInstance.schema);
		if (validationErrors) {
			throw validationErrors;
		}
	}
	const result = new Transaction({ ...transaction, params: paramsBytes });

	if (!passphrase) {
		return result;
	}

	if (!networkIdentifier) {
		throw new Error('Network identifier is required to sign a transaction');
	}

	const keys = getKeys(passphrase);
	result.sign(networkIdentifier, keys.privateKey);

	return result;
};
