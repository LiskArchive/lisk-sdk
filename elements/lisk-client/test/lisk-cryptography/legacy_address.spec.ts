/* eslint-disable import/first */
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

import { cryptography } from '../../src';

const {
	legacyAddress: {
		getLegacyAddressAndPublicKeyFromPassphrase,
		getLegacyAddressFromPassphrase,
		getLegacyAddressFromPrivateKey,
		getLegacyAddressFromPublicKey,
		getFirstEightBytesReversed,
	},
} = cryptography;

describe('Legacy address', () => {
	const defaultPassphrase =
		'purity retire hamster gold unfold stadium hunt truth movie walnut gun bean';
	const defaultPrivateKey = Buffer.from(
		'bf338d9da23ccbc140e440f7da96718eb3f8b84ba4fe57e0a7a91f8c602e8015b56b53b205287d52ae63c688bf62e86ad81e8e1e5dd9aaef2e68711152b7a58a',
		'hex',
	);
	const defaultPublicKey = Buffer.from(
		'b56b53b205287d52ae63c688bf62e86ad81e8e1e5dd9aaef2e68711152b7a58a',
		'hex',
	);
	const defaultAddress = '7115442636316065252L';

	describe('#getFirstEightBytesReversed', () => {
		const defaultStringWithMoreThanEightCharacters = '0123456789';
		const defaultFirstEightCharactersReversed = '76543210';

		it('should get the first eight bytes reversed from a Buffer', () => {
			const bufferEntry = Buffer.from(defaultStringWithMoreThanEightCharacters);
			const reversedAndCut = getFirstEightBytesReversed(bufferEntry);
			expect(reversedAndCut).toEqual(Buffer.from(defaultFirstEightCharactersReversed));
		});

		it('should get the first eight bytes reversed from a string', () => {
			const reversedAndCut = getFirstEightBytesReversed(defaultStringWithMoreThanEightCharacters);
			expect(reversedAndCut).toEqual(Buffer.from(defaultFirstEightCharactersReversed));
		});
	});

	describe('#getLegacyAddressAndPublicKeyFromPassphrase', () => {
		it('should return expected address', () => {
			expect(getLegacyAddressAndPublicKeyFromPassphrase(defaultPassphrase)).toEqual({
				address: defaultAddress,
				publicKey: defaultPublicKey,
			});
		});
	});

	describe('#getLegacyAddressFromPassphrase', () => {
		it('should return expected address', () => {
			expect(getLegacyAddressFromPassphrase(defaultPassphrase)).toEqual(defaultAddress);
		});
	});

	describe('#getLegacyAddressFromPrivateKey', () => {
		it('should return expected address', () => {
			expect(getLegacyAddressFromPrivateKey(defaultPrivateKey)).toEqual(defaultAddress);
		});
	});

	describe('#getLegacyAddressFromPublicKey', () => {
		it('should return expected address', () => {
			expect(getLegacyAddressFromPublicKey(defaultPublicKey)).toEqual(defaultAddress);
		});
	});
});
