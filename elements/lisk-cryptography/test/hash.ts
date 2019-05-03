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
import { hash as hashFunction, deepHashBuffer } from '../src/hash';
import { expect } from 'chai';

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

	describe('#deepHashBuffer', () => {
		// Using payloadhash of blockId: 6887177024011791543
		const defaultResult = Buffer.from(
			'67360d5ff877fd9905501a893ded470d028a6c85b8d87498709517d2034bf656',
			'hex',
		);
		const testBufferArray = [
			Buffer.from(
				'00024c6105d867bc67114d4a3a7f7cf9cbd9e1b9473a8ac758ba03329ca83938c07f5a86973b689d9137f8459100f3b7ee010000006e5eb4bfde46d42a7b438155d79a6e977042d5764ed4ca79b31ac36dcc8ac1e9424cd017ebb0a76069de8ee6e0c9d84e65e20fdd174d9bf8d35d81aa17cd9709',
				'hex',
			),
			Buffer.from(
				'00f34561051b0fcf0c1af9eeb55350ad9ff718995c7d46e13d5ae355c780e0e54a6b6904609752ac63dded9de40079c65e02000000e5216cae66f955dfaa71a6d9ddfa097af9957ccdf157b117d6f83af3bb472ed1224245f853ff1ae1d507e494da45ae285d400df01700033997eb25b8dce65609',
				'hex',
			),
		];

		it('should generate a sha256 hash from a Buffer array', () => {
			const hash = deepHashBuffer(testBufferArray);
			return expect(hash).to.be.eql(defaultResult);
		});
	});
});
