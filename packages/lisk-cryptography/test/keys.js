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
import {
	getPrivateAndPublicKeyFromPassphrase,
	getPrivateAndPublicKeyBytesFromPassphrase,
	getKeys,
	getAddressAndPublicKeyFromPassphrase,
	getAddressFromPassphrase,
} from '../src/keys';
// Require is used for stubbing
const buffer = require('../src/buffer');
const hash = require('../src/hash');

describe('keys', () => {
	const defaultPassphrase = 'secret';
	const defaultPassphraseHash =
		'2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b';
	const defaultPrivateKey =
		'2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultPublicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultAddress = '16402986683325069355L';
	const defaultAddressAndPublicKey = {
		publicKey: defaultPublicKey,
		address: defaultAddress,
	};

	let bufferToHexStub;

	beforeEach(() => {
		bufferToHexStub = sandbox.stub(buffer, 'bufferToHex');
		bufferToHexStub
			.withArgs(Buffer.from(defaultPrivateKey, 'hex'))
			.returns(defaultPrivateKey);
		bufferToHexStub
			.withArgs(Buffer.from(defaultPublicKey, 'hex'))
			.returns(defaultPublicKey);
		return sandbox
			.stub(hash, 'default')
			.returns(Buffer.from(defaultPassphraseHash, 'hex'));
	});

	describe('#getPrivateAndPublicKeyBytesFromPassphrase', () => {
		let keyPair;

		beforeEach(() => {
			keyPair = getPrivateAndPublicKeyBytesFromPassphrase(defaultPassphrase);
			return Promise.resolve();
		});

		it('should create buffer publicKey', () => {
			return expect(
				Buffer.from(keyPair.publicKeyBytes).toString('hex'),
			).to.be.equal(defaultPublicKey);
		});

		it('should create buffer privateKey', () => {
			return expect(
				Buffer.from(keyPair.privateKeyBytes).toString('hex'),
			).to.be.equal(defaultPrivateKey);
		});
	});

	describe('#getPrivateAndPublicKeyFromPassphrase', () => {
		let keyPair;

		beforeEach(() => {
			keyPair = getPrivateAndPublicKeyFromPassphrase(defaultPassphrase);
			return Promise.resolve();
		});

		it('should generate the correct publicKey from a passphrase', () => {
			return expect(keyPair)
				.to.have.property('publicKey')
				.and.be.equal(defaultPublicKey);
		});

		it('should generate the correct privateKey from a passphrase', () => {
			return expect(keyPair)
				.to.have.property('privateKey')
				.and.be.equal(defaultPrivateKey);
		});
	});

	describe('#getKeys', () => {
		let keyPair;

		beforeEach(() => {
			keyPair = getKeys(defaultPassphrase);
			return Promise.resolve();
		});

		it('should generate the correct publicKey from a passphrase', () => {
			return expect(keyPair)
				.to.have.property('publicKey')
				.and.be.equal(defaultPublicKey);
		});

		it('should generate the correct privateKey from a passphrase', () => {
			return expect(keyPair)
				.to.have.property('privateKey')
				.and.be.equal(defaultPrivateKey);
		});
	});

	describe('#getAddressAndPublicKeyFromPassphrase', () => {
		it('should create correct address and publicKey', () => {
			return expect(
				getAddressAndPublicKeyFromPassphrase(defaultPassphrase),
			).to.eql(defaultAddressAndPublicKey);
		});
	});

	describe('#getAddressFromPassphrase', () => {
		it('should create correct address', () => {
			return expect(getAddressFromPassphrase(defaultPassphrase)).to.equal(
				defaultAddress,
			);
		});
	});
});
