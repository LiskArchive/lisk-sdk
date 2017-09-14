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
	getPrivateAndPublicKeyFromSecret,
	getRawPrivateAndPublicKeyFromSecret,
	getKeys,
	getAddressAndPublicKeyFromSecret,
} from '../../src/crypto/keys';
import {
	bufferToHex,
} from '../../src/crypto/convert';

describe('keys', () => {
	const defaultSecret = 'secret';
	const defaultPublicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultPrivateKey = '2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultAddressAndPublicKey = {
		publicKey: defaultPublicKey,
		address: '18160565574430594874L',
	};
	describe('#getPrivateAndPublicKeyFromSecret', () => {
		const keypair = getPrivateAndPublicKeyFromSecret(defaultSecret);

		it('should generate the correct publicKey from a secret', () => {
			(keypair.publicKey).should.be.equal(defaultPublicKey);
		});

		it('should generate the correct privateKey from a secret', () => {
			(keypair.privateKey).should.be.equal(defaultPrivateKey);
		});
	});

	describe('#getRawPrivateAndPublicKeyFromSecret', () => {
		const keypair = getRawPrivateAndPublicKeyFromSecret(defaultSecret);

		it('should create buffer publicKey', () => {
			(bufferToHex(
				Buffer.from(keypair.publicKey))
			).should.be.equal(defaultPublicKey);
		});

		it('should create buffer privateKey', () => {
			(bufferToHex(Buffer.from(keypair.privateKey)))
				.should.be.equal(defaultPrivateKey);
		});
	});

	describe('#getKeys', () => {
		it('should return two keys in hex', () => {
			const keys = getKeys('secret');

			(keys).should.have.property('publicKey').and.be.type('string').and.be.hexString();
			(keys).should.have.property('privateKey').and.be.type('string').and.be.hexString();
			(keys).should.be.eql({
				publicKey: defaultPublicKey,
				privateKey: defaultPrivateKey,
			});
		});
	});

	describe('#getAddressAndPublicKeyFromSecret', () => {
		it('should create correct address and publicKey', () => {
			(getAddressAndPublicKeyFromSecret(defaultSecret)).should.eql(defaultAddressAndPublicKey);
		});
	});
});
