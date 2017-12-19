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
import {
	prependPlusToPublicKeys,
	prependMinusToPublicKeys,
} from '../../../src/transactions/utils/format';

describe('format', () => {
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
				return prependPlusToPublicKeys(publicKeys).should.be.eql(
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
				return prependMinusToPublicKeys(publicKeys).should.be.eql(
					expectedOutput,
				);
			});
		});
	});
});
