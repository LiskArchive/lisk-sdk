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
import { expect } from 'chai';
import {
	convertBeddowsToLSK,
	convertLSKToBeddows,
	prependPlusToPublicKeys,
	prependMinusToPublicKeys,
} from '../../src/utils/format';

describe('format', () => {
	describe('#convertBeddowsToLSK', () => {
		it('should error if not given a string', () => {
			return expect(convertBeddowsToLSK.bind(null, 12345678 as any)).to.throw(
				'Cannot convert non-string amount',
			);
		});
		it('should error on 0.1', () => {
			return expect(convertBeddowsToLSK.bind(null, '0.1')).to.throw(
				'Beddows amount should not have decimal points',
			);
		});
		it('should error on 9223372036854775808', () => {
			return expect(
				convertBeddowsToLSK.bind(null, '9223372036854775808'),
			).to.throw('Beddows amount out of range');
		});
		it('should convert 100000000 to 1', () => {
			return expect(convertBeddowsToLSK('100000000')).to.equal('1');
		});
		it('should convert 1 to 0.00000001', () => {
			return expect(convertBeddowsToLSK('1')).to.equal('0.00000001');
		});
		it('should convert 10000000000000000 to 100000000', () => {
			return expect(convertBeddowsToLSK('10000000000000000')).to.equal(
				'100000000',
			);
		});
		it('should convert 9223372036854775807 to 92233720368.54775807', () => {
			return expect(convertBeddowsToLSK('9223372036854775807')).to.equal(
				'92233720368.54775807',
			);
		});
	});
	describe('#convertLSKToBeddows', () => {
		it('should error if not given a string', () => {
			return expect(convertLSKToBeddows.bind(null, 12345678 as any)).to.throw(
				'Cannot convert non-string amount',
			);
		});
		it('should error on 0.000000001', () => {
			return expect(convertLSKToBeddows.bind(null, '0.000000001')).to.throw(
				'LSK amount has too many decimal points',
			);
		});
		it('should error on 92233720368.54775808', () => {
			return expect(
				convertLSKToBeddows.bind(null, '92233720368.54775808'),
			).to.throw('LSK amount out of range');
		});
		it('should convert 1 to 100000000', () => {
			return expect(convertLSKToBeddows('1')).to.equal('100000000');
		});
		it('should convert 0.00000001 to 1', () => {
			return expect(convertLSKToBeddows('0.00000001')).to.equal('1');
		});
		it('should convert 100000000 to 10000000000000000', () => {
			return expect(convertLSKToBeddows('100000000')).to.equal(
				'10000000000000000',
			);
		});
		it('should convert 92233720368.54775807 to 9223372036854775807', () => {
			return expect(convertLSKToBeddows('92233720368.54775807')).to.equal(
				'9223372036854775807',
			);
		});
	});
	describe('#prependPlusToPublicKeys', () => {
		describe('Given an array of public keys', () => {
			it('should append plus to each public key', () => {
				const publicKeys = [
					'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
					'922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
					'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				];
				const expectedOutput = [
					'+215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
					'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
					'+5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				];
				return expect(prependPlusToPublicKeys(publicKeys)).to.be.eql(
					expectedOutput,
				);
			});
		});
	});

	describe('#prependMinusToPublicKeys', () => {
		describe('Given an array of public keys', () => {
			it('should append minus to each public key', () => {
				const publicKeys = [
					'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
					'922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
					'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				];
				const expectedOutput = [
					'-215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
					'-922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
					'-5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				];
				return expect(prependMinusToPublicKeys(publicKeys)).to.be.eql(
					expectedOutput,
				);
			});
		});
	});
});
