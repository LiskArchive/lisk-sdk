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

export const getSignaturesBytes = (signatures: ReadonlyArray<string>) => {
	if (signatures?.length) {
		// tslint:disable-next-line: no-unnecessary-callback-wrapper
		const signaturesBuffer = signatures.map(signature =>
			hexToBuffer(signature),
		);

		return Buffer.concat(signaturesBuffer);
	}

	return Buffer.alloc(0);
};
