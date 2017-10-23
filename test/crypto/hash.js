/*
 * Copyright © 2017 Lisk Foundation
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
import { getSha256Hash } from '../../src/crypto/hash';

describe('hash', () => {
	describe('#getSha256Hash', () => {
		const defaultText = 'text123*';
		let arrayToHash;
		let defaultHash;

		beforeEach(() => {
			defaultHash = Buffer.from(
				'7607d6792843d6003c12495b54e34517a508d2a8622526aff1884422c5478971',
				'hex',
			);
			arrayToHash = [1, 2, 3];
		});

		it('should generate a sha256 hash from a Buffer', () => {
			const testBuffer = Buffer.from(defaultText);
			const hash = getSha256Hash(testBuffer);
			hash.should.be.eql(defaultHash);
		});

		it('should generate a sha256 hash from a utf8 string', () => {
			const hash = getSha256Hash(defaultText, 'utf8');
			hash.should.be.eql(defaultHash);
		});

		it('should generate a sha256 hash from a hex string', () => {
			const testHex = Buffer.from(defaultText).toString('hex');
			const hash = getSha256Hash(testHex, 'hex');
			hash.should.be.eql(defaultHash);
		});

		it('should throw on unknown format when trying a string with format "utf32"', () => {
			getSha256Hash
				.bind(null, defaultText, 'utf32')
				.should.throw(
					'Unsupported string format. Currently only `hex` and `utf8` are supported.',
				);
		});

		it('should throw on unknown format when using an array', () => {
			getSha256Hash
				.bind(null, arrayToHash)
				.should.throw(
					'Unsupported data format. Currently only Buffers or `hex` and `utf8` strings are supported.',
				);
		});
	});
});
