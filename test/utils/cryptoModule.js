/*
 * LiskHQ/lisky
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
import lisk from 'lisk-js';
import cryptoModule from '../../src/utils/cryptoModule';

describe('cryptoModule', () => {
	describe('exports', () => {
		it('should export an object', () => {
			(cryptoModule).should.be.type('object');
		});

		it('should export a Crypto instance', () => {
			(cryptoModule.constructor).should.have.property('name').and.be.equal('Crypto');
		});

		it('should have lisk-js as a property', () => {
			(cryptoModule).should.have.property('liskCrypto').and.be.equal(lisk.crypto);
		});
	});

	describe('#encryptMessage', () => {
		const message = 'Hello Lisker';
		const secret = 'pass phrase';
		const recipient = 'bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0';
		const encryptMessageWithSecretResult = {
			nonce: 'abc123',
			encryptedMessage: 'def456',
		};

		let encryptMessageWithSecretStub;

		beforeEach(() => {
			encryptMessageWithSecretStub = sinon
				.stub(lisk.crypto, 'encryptMessageWithSecret')
				.returns(Object.assign({}, encryptMessageWithSecretResult));
		});

		afterEach(() => {
			encryptMessageWithSecretStub.restore();
		});

		it('should use lisk-js encryptMessageWithSecret', () => {
			cryptoModule.encryptMessage(message, secret, recipient);

			(encryptMessageWithSecretStub.calledWithExactly(message, secret, recipient))
				.should.be.true();
		});

		it('should return the result of lisk-js encryptMessageWithSecret', () => {
			const result = cryptoModule.encryptMessage(message, secret, recipient);
			(result).should.be.eql(encryptMessageWithSecretResult);
		});

		it('should handle error responses', () => {
			const errorMessage = 'Cannot read property \'length\' of null';
			const error = new TypeError(errorMessage);
			encryptMessageWithSecretStub.throws(error);

			const result = cryptoModule.encryptMessage(message, secret, recipient);

			(result).should.have.property('error', errorMessage);
		});
	});

	describe('#decryptMessage', () => {
		const encryptedMessage = '4728715ed4463a37d8e90720a27377f04a84911b95520c2582a8b6da';
		const nonce = '682be05eeb73a794163b5584cac6b33769c2abd867459cae';
		const secret = 'recipient secret';
		// sender secret: 'sender secret'
		const senderPublicKey = '38433137692948be1c05bbae686c9c850d3c8d9c52c1aebb4a7c1d5dd6d010d7';
		const decryptMessageWithSecretResult = 'abc123';

		let decryptMessageWithSecretStub;

		beforeEach(() => {
			decryptMessageWithSecretStub = sinon
				.stub(lisk.crypto, 'decryptMessageWithSecret')
				.returns(decryptMessageWithSecretResult);
		});

		afterEach(() => {
			decryptMessageWithSecretStub.restore();
		});

		it('should use lisk-js decryptMessageWithSecret', () => {
			cryptoModule.decryptMessage(encryptedMessage, nonce, secret, senderPublicKey);

			(decryptMessageWithSecretStub.calledWithExactly(
				encryptedMessage, nonce, secret, senderPublicKey,
			))
				.should.be.true();
		});

		it('should return the processed result of lisk-js encryptMessageWithSecret', () => {
			const result = cryptoModule.decryptMessage(encryptedMessage, nonce, secret, senderPublicKey);
			(result).should.be.eql({
				message: decryptMessageWithSecretResult,
			});
		});

		it('should handle error responses', () => {
			const errorMessage = 'Cannot read property \'length\' of null';
			const error = new TypeError(errorMessage);
			decryptMessageWithSecretStub.throws(error);

			const result = cryptoModule.decryptMessage(encryptedMessage, nonce, secret, senderPublicKey);

			(result).should.have.property('error', errorMessage);
		});
	});

	describe('#encryptPassphrase', () => {
		const passphrase = 'secret passphrase';
		const password = 'testing123';

		let encryptPassphraseWithPasswordResult;
		let encryptPassphraseWithPasswordStub;

		beforeEach(() => {
			encryptPassphraseWithPasswordResult = {
				cipher: 'abcd',
				iv: '0123',
			};
			encryptPassphraseWithPasswordStub = sinon
				.stub(lisk.crypto, 'encryptPassphraseWithPassword')
				.returns(Object.assign({}, encryptPassphraseWithPasswordResult));
		});

		afterEach(() => {
			encryptPassphraseWithPasswordStub.restore();
		});

		it('should use lisk-js encryptPassphraseWithPassword', () => {
			cryptoModule.encryptPassphrase(passphrase, password);

			(encryptPassphraseWithPasswordStub.calledWithExactly(passphrase, password))
				.should.be.true();
		});

		it('should return the result of lisk-js encryptPassphraseWithPassword', () => {
			const result = cryptoModule.encryptPassphrase(passphrase, password);
			(result).should.be.eql(encryptPassphraseWithPasswordResult);
		});

		it('should handle error responses', () => {
			const errorMessage = 'Cannot read property \'length\' of null';
			const error = new TypeError(errorMessage);
			encryptPassphraseWithPasswordStub.throws(error);

			const result = cryptoModule.encryptPassphrase(passphrase, password);

			(result).should.have.property('error', errorMessage);
		});
	});

	describe('#decryptPassphrase', () => {
		const cipher = 'abcd';
		const iv = '0123';
		const cipherAndIv = { cipher, iv };
		const password = 'testing123';
		const passphrase = 'secret passphrase';

		let decryptPassphraseWithPasswordStub;

		beforeEach(() => {
			decryptPassphraseWithPasswordStub = sinon
				.stub(lisk.crypto, 'decryptPassphraseWithPassword')
				.returns(passphrase);
		});

		afterEach(() => {
			decryptPassphraseWithPasswordStub.restore();
		});

		it('should use lisk-js decryptPassphraseWithPassword', () => {
			cryptoModule.decryptPassphrase(cipherAndIv, password);

			(decryptPassphraseWithPasswordStub.calledWithExactly(cipherAndIv, password))
				.should.be.true();
		});

		it('should return the processed result of lisk-js decryptPassphraseWithPassword', () => {
			const result = cryptoModule.decryptPassphrase(cipherAndIv, password);
			(result).should.be.eql({ passphrase });
		});

		it('should handle error responses', () => {
			const errorMessage = 'Cannot read property \'length\' of null';
			const error = new TypeError(errorMessage);
			decryptPassphraseWithPasswordStub.throws(error);

			const result = cryptoModule.decryptPassphrase(cipherAndIv, password);

			(result).should.have.property('error', errorMessage);
		});
	});
});
