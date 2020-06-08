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
import { hash as hashFunction, getNetworkIdentifier } from '../src/hash';

describe('hash', () => {
	describe('#hash', () => {
		const defaultText = 'text123*';
		let arrayToHash: ReadonlyArray<number>;
		let defaultHash: Buffer;

		beforeEach(async () => {
			defaultHash = Buffer.from(
				'7607d6792843d6003c12495b54e34517a508d2a8622526aff1884422c5478971',
				'hex',
			);
			arrayToHash = [1, 2, 3];
			return Promise.resolve();
		});

		it('should generate a sha256 hash from a Buffer', () => {
			const testBuffer = Buffer.from(defaultText);
			const hash = hashFunction(testBuffer);
			expect(hash).toEqual(defaultHash);
		});

		it('should generate a sha256 hash from a utf8 string', () => {
			const hash = hashFunction(defaultText, 'utf8');
			expect(hash).toEqual(defaultHash);
		});

		it('should generate a sha256 hash from a hex string', () => {
			const testHex = Buffer.from(defaultText).toString('hex');
			const hash = hashFunction(testHex, 'hex');
			expect(hash).toEqual(defaultHash);
		});

		it('should throw on unknown format when trying a string with format "utf32"', () => {
			expect(hashFunction.bind(null, defaultText, 'utf32')).toThrow(
				'Unsupported string format. Currently only `hex` and `utf8` are supported.',
			);
		});

		it('should throw on unknown format when using an array', () => {
			expect(hashFunction.bind(null, arrayToHash as any)).toThrow(
				'Unsupported data:1,2,3 and format:undefined. Currently only Buffers or hex and utf8 strings are supported.',
			);
		});
	});

	describe('#getNetworkIdentifier', () => {
		const genesisBlockTransactionRoot = Buffer.from(
			'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
			'hex',
		);
		const communityIdentifier = 'LISK';
		const expectedHash = Buffer.from(
			'6f201e72e20571b93ed42470caa94af1ace79dc9930ab5bb144ddd5df5753e73',
			'hex',
		);

		it('should generate a sha256 hash from genesis block transaction root and community identifier', () => {
			const networkIdentifier = getNetworkIdentifier(
				genesisBlockTransactionRoot,
				communityIdentifier,
			);

			expect(networkIdentifier).toEqual(expectedHash);
		});
	});
});
