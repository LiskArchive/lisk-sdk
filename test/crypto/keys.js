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

const convert = require('../../src/crypto/convert');
const hash = require('../../src/crypto/hash');

describe('keys', () => {
	const defaultSecret = 'secret';
	const defaultSecretHash = '2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b';
	const defaultPrivateKey = '2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultPublicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultAddressAndPublicKey = {
		publicKey: defaultPublicKey,
		address: '16402986683325069355L',
	};

	let bufferToHexStub;

	beforeEach(() => {
		bufferToHexStub = sandbox.stub(convert, 'bufferToHex');
		bufferToHexStub.withArgs(Buffer.from(defaultPrivateKey, 'hex')).returns(defaultPrivateKey);
		bufferToHexStub.withArgs(Buffer.from(defaultPublicKey, 'hex')).returns(defaultPublicKey);
		sandbox.stub(hash, 'getSha256Hash').returns(Buffer.from(defaultSecretHash, 'hex'));
	});

	describe('#getRawPrivateAndPublicKeyFromSecret', () => {
		let keyPair;

		beforeEach(() => {
			keyPair = getRawPrivateAndPublicKeyFromSecret(defaultSecret);
		});

		it('should create buffer publicKey', () => {
			(Buffer.from(keyPair.publicKey).toString('hex')).should.be.equal(defaultPublicKey);
		});

		it('should create buffer privateKey', () => {
			(Buffer.from(keyPair.privateKey).toString('hex')).should.be.equal(defaultPrivateKey);
		});
	});

	describe('#getPrivateAndPublicKeyFromSecret', () => {
		let keyPair;

		beforeEach(() => {
			keyPair = getPrivateAndPublicKeyFromSecret(defaultSecret);
		});

		it('should generate the correct publicKey from a secret', () => {
			(keyPair).should.have.property('publicKey').and.be.equal(defaultPublicKey);
		});

		it('should generate the correct privateKey from a secret', () => {
			(keyPair).should.have.property('privateKey').and.be.equal(defaultPrivateKey);
		});
	});

	describe('#getKeys', () => {
		let keyPair;

		beforeEach(() => {
			keyPair = getKeys(defaultSecret);
		});

		it('should generate the correct publicKey from a secret', () => {
			(keyPair).should.have.property('publicKey').and.be.equal(defaultPublicKey);
		});

		it('should generate the correct privateKey from a secret', () => {
			(keyPair).should.have.property('privateKey').and.be.equal(defaultPrivateKey);
		});
	});

	describe('#getAddressAndPublicKeyFromSecret', () => {
		it('should create correct address and publicKey', () => {
			(getAddressAndPublicKeyFromSecret(defaultSecret)).should.eql(defaultAddressAndPublicKey);
		});
	});
});
