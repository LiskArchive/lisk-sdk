/*
 * Copyright © 2022 Lisk Foundation
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
import { cryptography } from '../../src';

const {
	bls: { getPrivateKeyFromPhraseAndPath },
} = cryptography;

describe('bls', () => {
	describe('getBLSPrivateKeyFromPhraseAndPath', () => {
		const passphrase =
			'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
		it('should get keypair from valid phrase and path', async () => {
			const privateKey = await getPrivateKeyFromPhraseAndPath(passphrase, `m/12381`);
			expect(privateKey.toString('hex')).toBe(
				BigInt(
					'27531519788986738912817629815232258573173656766051821145387425994698573826996',
				).toString(16),
			);
		});
	});
});
