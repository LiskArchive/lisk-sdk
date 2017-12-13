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
	validatePublicKey,
	validatePublicKeys,
} from '../../../src/transactions/utils/validatePublicKey';

describe('validate public key', () => {
	describe('#validatePublicKey', () => {
		describe('Given an invalid hex public key', () => {
			const invalidHexPublicKey =
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bc';
			it('should throw an error', () => {
				validatePublicKey
					.bind(null, invalidHexPublicKey)
					.should.throw('Invalid hex string');
			});
		});

		describe('Given a too long public key', () => {
			const tooLongPublicKey =
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca12';
			it('should throw an error', () => {
				validatePublicKey
					.bind(null, tooLongPublicKey)
					.should.throw(
						'Public key 215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca12 length differs from the expected 64 hex characters (32 bytes) for a public key.',
					);
			});
		});

		describe('Given a too short public key', () => {
			const tooShortPublicKey =
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452b';
			it('should throw an error', () => {
				validatePublicKey
					.bind(null, tooShortPublicKey)
					.should.throw(
						'Public key 215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452b length differs from the expected 64 hex characters (32 bytes) for a public key.',
					);
			});
		});

		describe('Given a correct public key', () => {
			const publicKey =
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca';
			it('should return the public key', () => {
				validatePublicKey(publicKey).should.be.equal(publicKey);
			});
		});

		describe('Given a correct, all-numeric public key', () => {
			const publicKey =
				'1234567812345678123456781234567812345678123456781234567812345678';
			it('should return the public key', () => {
				validatePublicKey(publicKey).should.be.equal(publicKey);
			});
		});
	});

	describe('#validatePublicKeys', () => {
		describe('Given an array of public keys', () => {
			const publicKeys = [
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
				'922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
				'1234567812345678123456781234567812345678123456781234567812345678',
			];
			it('should return the public keys', () => {
				validatePublicKeys(publicKeys).should.be.eql(publicKeys);
			});
		});

		describe('Given an array of public keys with one invalid public key', () => {
			const publicKeys = [
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bc',
			];
			it('should throw an error', () => {
				validatePublicKeys
					.bind(null, publicKeys)
					.should.throw('Invalid hex string');
			});
		});
	});
});
