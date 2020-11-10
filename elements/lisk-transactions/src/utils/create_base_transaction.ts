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
	getAddressAndPublicKeyFromPassphrase,
	hexToBuffer,
} from '@liskhq/lisk-cryptography';

export interface CreateBaseTransactionInput {
	readonly nonce: string;
	readonly fee: string;
	readonly passphrase?: string;
	readonly secondPassphrase?: string;
}

export const createBaseTransaction = ({
	passphrase,
	nonce,
	fee,
}: CreateBaseTransactionInput) => {
	const { publicKey: senderPublicKey } = passphrase
		? getAddressAndPublicKeyFromPassphrase(passphrase)
		: { publicKey: undefined };

	return {
		nonce,
		fee,
		senderPublicKey,
	};
};

export const SIGNATURE_NOT_PRESENT = Buffer.from('00', 'hex');
export const SIGNATURE_PRESENT = Buffer.from('01', 'hex');

export const serializeSignatures = (signatures: ReadonlyArray<string>) => {
	const signaturesBuffer = signatures.map(signature => {
		// If signature is empty append 0x00 to byteBuffer
		if (signature.length === 0) {
			return SIGNATURE_NOT_PRESENT;
		}

		// If signature is not empty append 0x01 to byteBuffer
		return Buffer.concat([SIGNATURE_PRESENT, hexToBuffer(signature)]);
	});

	return Buffer.concat(signaturesBuffer);
};
