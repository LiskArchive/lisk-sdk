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
import { legacy } from '@liskhq/lisk-cryptography';
import { validateTransaction } from '@liskhq/lisk-transactions';
import { CommandClass } from './types';

interface CreateTransactionInput {
	module: string;
	commandClass: CommandClass;
	params: Record<string, unknown> | undefined;
	nonce?: bigint;
	fee?: bigint;
	passphrase?: string;
	chainID?: Buffer;
}

export const createTransaction = ({
	module,
	commandClass,
	params,
	nonce,
	fee,
	passphrase,
	chainID,
}: CreateTransactionInput): Transaction => {
	const { publicKey, privateKey } = legacy.getPrivateAndPublicKeyFromPassphrase(passphrase ?? '');
	// eslint-disable-next-line new-cap
	const commandInstance = new commandClass();
	const command = commandInstance.name;
	const paramsBytes =
		commandInstance.schema && params
			? codec.encode(commandInstance.schema, params)
			: Buffer.alloc(0);

	const transaction = {
		module,
		command,
		nonce: nonce ?? BigInt(0),
		fee: fee ?? BigInt(0),
		senderPublicKey: publicKey,
		params,
		signatures: [],
	};

	if (commandInstance.schema) {
		validateTransaction(transaction, commandInstance.schema);
	}
	const result = new Transaction({ ...transaction, params: paramsBytes });

	if (!passphrase) {
		return result;
	}

	if (!chainID) {
		throw new Error('Network identifier is required to sign a transaction');
	}

	result.sign(chainID, privateKey);

	return result;
};
