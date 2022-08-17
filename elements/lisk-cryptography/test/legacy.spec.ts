/*
 * Copyright © 2020 Lisk Foundation
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
import { getKeys, getPrivateAndPublicKeyFromPassphrase } from '../src/legacy';
import { Keypair } from '../src/types';

describe('Legacy', () => {
	const defaultPassphrase =
		'purity retire hamster gold unfold stadium hunt truth movie walnut gun bean';
	const defaultPrivateKey =
		'bf338d9da23ccbc140e440f7da96718eb3f8b84ba4fe57e0a7a91f8c602e8015b56b53b205287d52ae63c688bf62e86ad81e8e1e5dd9aaef2e68711152b7a58a';
	const defaultPublicKey = 'b56b53b205287d52ae63c688bf62e86ad81e8e1e5dd9aaef2e68711152b7a58a';

	describe('#getPrivateAndPublicKeyFromPassphrase', () => {
		let keyPair: Keypair;

		beforeEach(() => {
			keyPair = getPrivateAndPublicKeyFromPassphrase(defaultPassphrase);
		});

		it('should generate the correct publicKey from a passphrase', () => {
			expect(keyPair).toHaveProperty('publicKey', Buffer.from(defaultPublicKey, 'hex'));
		});

		it('should generate the correct privateKey from a passphrase', () => {
			expect(keyPair).toHaveProperty('privateKey', Buffer.from(defaultPrivateKey, 'hex'));
		});
	});

	describe('#getKeys', () => {
		let keyPair: Keypair;

		beforeEach(() => {
			keyPair = getKeys(defaultPassphrase);
		});

		it('should generate the correct publicKey from a passphrase', () => {
			expect(keyPair).toHaveProperty('publicKey', Buffer.from(defaultPublicKey, 'hex'));
		});

		it('should generate the correct privateKey from a passphrase', () => {
			expect(keyPair).toHaveProperty('privateKey', Buffer.from(defaultPrivateKey, 'hex'));
		});
	});
});
