/*
 * Copyright © 2023 Lisk Foundation
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

import { utils, ed } from '@liskhq/lisk-cryptography';
import { Transaction, TAG_TRANSACTION } from '@liskhq/lisk-chain';
import { verifySignature } from '../../../../src/modules/auth/utils';

describe('utils', () => {
	describe('verifySignature', () => {
		const chainID = Buffer.from('04000000', 'hex');

		it('should verify a valid transaction signature', async () => {
			const privateKey = await ed.getPrivateKeyFromPhraseAndPath('hello lisk', "m/44'/134'/0'");
			const publicKey = ed.getPublicKeyFromPrivateKey(privateKey);

			const transaction = new Transaction({
				module: 'token',
				command: 'transfer',
				nonce: BigInt('0'),
				fee: BigInt('100000000'),
				senderPublicKey: publicKey,
				params: utils.getRandomBytes(100),
				signatures: [],
			});

			const transactionSigningBytes = transaction.getSigningBytes();
			const signature = ed.signDataWithPrivateKey(
				TAG_TRANSACTION,
				chainID,
				transactionSigningBytes,
				privateKey,
			);

			transaction.signatures.push(signature);

			expect(() =>
				verifySignature(chainID, publicKey, signature, transactionSigningBytes, transaction.id),
			).not.toThrow();
		});
	});
});
