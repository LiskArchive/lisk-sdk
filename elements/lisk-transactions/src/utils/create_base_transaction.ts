/*
 * Copyright © 2019 Lisk Foundation
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

import {
	getAddressAndPublicKeyFromPassphrase, bufferToHex,
} from '@liskhq/lisk-cryptography';
import { TransactionJSON } from '../types';

export interface CreateBaseTransactionInput {
	readonly nonce: string;
	readonly fee: string;
	readonly passphrase?: string;
	readonly secondPassphrase?: string;
}

interface BaseTransaction {
	readonly id: Buffer;
	readonly type: number;
	readonly senderPublicKey: Buffer;
	readonly signatures: Array<Readonly<Buffer>>;
	readonly asset: object;
	readonly nonce: bigint;
	readonly fee: bigint;
}

// eslint-disable-next-line
export const createBaseTransaction = ({
	passphrase,
	nonce,
	fee,
}: CreateBaseTransactionInput) => {
	const { publicKey: senderPublicKey } = passphrase
		? getAddressAndPublicKeyFromPassphrase(passphrase)
		: { publicKey: undefined };

	return {
		nonce: BigInt(nonce),
		fee: BigInt(fee),
		senderPublicKey,
	};
};

export const baseTransactionToJSON = (transaction: BaseTransaction): Partial<TransactionJSON> => ({
	id: String(transaction.id),
	type: transaction.type,
	senderPublicKey: bufferToHex(transaction.senderPublicKey),
	signatures: transaction.signatures.map(s => bufferToHex(s as Buffer)),
	asset: transaction.asset,
	nonce: String(transaction.nonce),
	fee: String(transaction.fee),
});
