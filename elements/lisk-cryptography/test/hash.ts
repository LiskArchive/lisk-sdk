/*
 * Copyright © 2018 Lisk Foundation
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
import { hash as hashFunction, verifyChecksum } from '../src/hash';
import { expect } from 'chai';

describe('hash', () => {
	const defaultText = 'text123*';
	let arrayToHash: ReadonlyArray<number>;
	let defaultHash: Buffer;

	beforeEach(() => {
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
		return expect(hash).to.be.eql(defaultHash);
	});

	it('should generate a sha256 hash from a utf8 string', () => {
		const hash = hashFunction(defaultText, 'utf8');
		return expect(hash).to.be.eql(defaultHash);
	});

	it('should generate a sha256 hash from a hex string', () => {
		const testHex = Buffer.from(defaultText).toString('hex');
		const hash = hashFunction(testHex, 'hex');
		return expect(hash).to.be.eql(defaultHash);
	});

	it('should throw on unknown format when trying a string with format "utf32"', () => {
		return expect(hashFunction.bind(null, defaultText, 'utf32')).to.throw(
			'Unsupported string format. Currently only `hex` and `utf8` are supported.',
		);
	});

	it('should throw on unknown format when using an array', () => {
		return expect(hashFunction.bind(null, arrayToHash as any)).to.throw(
			'Unsupported data format. Currently only Buffers or `hex` and `utf8` strings are supported.',
		);
	});
});

describe('verifyChecksum', () => {
	const defaultText = 'text123*';
	const testBuffer = Buffer.from(defaultText);

	it('should return true when checksum is a match', () => {
		return expect(
			verifyChecksum(
				testBuffer,
				'7607d6792843d6003c12495b54e34517a508d2a8622526aff1884422c5478971',
			),
		).to.be.eql(true);
	});

	it('should return false when checksum is a mismatch', () => {
		return expect(
			verifyChecksum(
				testBuffer,
				'dbde6e431edd7f4672f039680c58d4a0b59bff2dacfa25d63a228ba2ce392bd1',
			),
		).to.be.eql(false);
	});

	it('should throw on unknown format when trying a string with format "utf32"', () => {
		return expect(verifyChecksum.bind(null, defaultText, 'utf32')).to.throw(
			'Unsupported data format. Currently only Buffers or `hex` and `utf8` strings are supported.',
		);
	});
});
