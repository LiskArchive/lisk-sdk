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
import cryptoModule from '../../src/crypto/index';

describe('keys', () => {
	describe('#getPrivateAndPublicKeyFromSecret keys.js', () => {
		const secret = '123';
		const expectedPublicKey = 'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd';
		const expectedPrivateKey = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd';

		const keypair = cryptoModule.getPrivateAndPublicKeyFromSecret(secret);

		it('should generate the correct publicKey from a secret', () => {
			(keypair.publicKey).should.be.equal(expectedPublicKey);
		});

		it('should generate the correct privateKey from a secret', () => {
			(keypair.privateKey).should.be.equal(expectedPrivateKey);
		});
	});

	describe('#getRawPrivateAndPublicKeyFromSecret keys.js', () => {
		const secret = '123';

		const keypair1 = cryptoModule.getPrivateAndPublicKeyFromSecret(secret);
		const keypair2 = cryptoModule.getRawPrivateAndPublicKeyFromSecret(secret);

		it('should create the same privateKey as the unraw function', () => {
			(cryptoModule.bufferToHex(
				Buffer.from(keypair2.publicKey))
			).should.be.equal(keypair1.publicKey);
		});

		it('should create the same privateKey as the unraw function', () => {
			(cryptoModule.bufferToHex(Buffer.from(keypair2.privateKey)))
				.should.be.equal(keypair1.privateKey);
		});
	});

	describe('#getAddressFromPublicKey keys.js', () => {
		const keys = cryptoModule.getKeys('123');
		const address1 = cryptoModule.getAddress(keys.publicKey);

		const secret = '123';
		const keypair = cryptoModule.getPrivateAndPublicKeyFromSecret(secret);
		const publicKey = keypair.publicKey;
		const address = cryptoModule.getAddressFromPublicKey(publicKey);

		it('should generate the same address as the old function', () => {
			(address).should.be.equal(address1);
		});
	});

	describe('#getKeys', () => {
		const getKeys = cryptoModule.getKeys;

		it('should be ok', () => {
			(getKeys).should.be.ok();
		});

		it('should be a function', () => {
			(getKeys).should.be.type('function');
		});

		it('should return two keys in hex', () => {
			const keys = getKeys('secret');

			(keys).should.be.ok();
			(keys).should.be.type('object');
			(keys).should.have.property('publicKey').and.be.type('string').and.be.hexString();
			(keys).should.have.property('privateKey').and.be.type('string').and.be.hexString();
		});
	});
});
