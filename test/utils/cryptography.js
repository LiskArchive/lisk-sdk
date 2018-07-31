/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import elements from 'lisk-elements';
import * as crypto from '../../src/utils/cryptography';

describe('crypto utils', () => {
	describe('elements throws error', () => {
		const errorMessage = 'some error';
		beforeEach(() => {
			return sandbox
				.stub(elements.cryptography, 'encryptMessageWithPassphrase')
				.throws(new Error(errorMessage));
		});

		it('should result in error object with the errorMessage', () => {
			return expect(crypto.encryptMessage.bind(null, 'random input')).to.throw(
				errorMessage,
			);
		});
	});

	describe('#encryptMessage', () => {
		const result = {
			result: 'result',
		};
		const input = {
			message: 'msg',
			passphrase: 'random-passphrase',
			recipient: 'recipient',
		};

		beforeEach(() => {
			sandbox
				.stub(elements.cryptography, 'encryptMessageWithPassphrase')
				.returns(result);
			return Promise.resolve();
		});

		it('should call encryptMessageWithPassphrase', () => {
			crypto.encryptMessage(input);
			return expect(
				elements.cryptography.encryptMessageWithPassphrase,
			).to.be.calledWithExactly(
				input.message,
				input.passphrase,
				input.recipient,
			);
		});

		it('message should be equal to the result of encryptMessageWithPassphrase', () => {
			const encryptedMessage = crypto.encryptMessage(input);
			return expect(encryptedMessage).to.equal(result);
		});
	});

	describe('#decryptMessage', () => {
		const result = 'message';
		const input = {
			cipher: 'cipher',
			nonce: 'nonce',
			passphrase: 'random-passphrase',
			senderPublicKey: 'recipient',
		};

		beforeEach(() => {
			sandbox
				.stub(elements.cryptography, 'decryptMessageWithPassphrase')
				.returns(result);
			return Promise.resolve();
		});

		it('should call decryptMessageWithPassphrase', () => {
			crypto.decryptMessage(input);
			return expect(
				elements.cryptography.decryptMessageWithPassphrase,
			).to.be.calledWithExactly(
				input.cipher,
				input.nonce,
				input.passphrase,
				input.senderPublicKey,
			);
		});

		it('message should be equal to the result of the decryptMessageWithPassphrase', () => {
			const decryptedMessage = crypto.decryptMessage(input);
			return expect(decryptedMessage.message).to.equal(result);
		});
	});

	describe('#encryptPassphrase', () => {
		const result = 'encryptedPassphrase';
		const passphraseObject = {
			iterations: 1,
			cipherText: 'cipher',
			iv: 'iv',
			salt: 'salt',
			tag: 'tag',
			version: '1',
		};

		beforeEach(() => {
			sandbox
				.stub(elements.cryptography, 'encryptPassphraseWithPassword')
				.returns(passphraseObject);
			return sandbox
				.stub(elements.cryptography, 'stringifyEncryptedPassphrase')
				.returns(result);
		});

		it('encrypted passphrase should equal to the result of stringifyEncryptedPassphrase', () => {
			const input = {
				passphrase: 'random-passphrase',
				password: 'password',
			};
			const encryptedPassphrase = crypto.encryptPassphrase(input);
			return expect(encryptedPassphrase.encryptedPassphrase).to.equal(result);
		});

		it('should call encryptPassphraseWithPassword', () => {
			const input = {
				passphrase: 'random-passphrase',
				password: 'password',
			};
			crypto.encryptPassphrase(input);

			return expect(
				elements.cryptography.encryptPassphraseWithPassword,
			).to.be.calledWithExactly(input.passphrase, input.password);
		});

		it('should call stringifyEncryptedPassphrase', () => {
			const input = {
				passphrase: 'random-passphrase',
				password: 'password',
			};
			crypto.encryptPassphrase(input);

			return expect(
				elements.cryptography.stringifyEncryptedPassphrase,
			).to.be.calledWithExactly(passphraseObject);
		});
	});

	describe('#decryptPassphrase', () => {
		const result = 'passphrase';
		const passphraseObject = {
			iterations: 1,
			cipherText: 'cipher',
			iv: 'iv',
			salt: 'salt',
			tag: 'tag',
			version: '1',
		};
		const input = {
			encryptedPassphrase: 'random-passphrase',
			password: 'password',
		};

		beforeEach(() => {
			sandbox
				.stub(elements.cryptography, 'parseEncryptedPassphrase')
				.returns(passphraseObject);
			return sandbox
				.stub(elements.cryptography, 'decryptPassphraseWithPassword')
				.returns(result);
		});

		it('passphrase should equal to the result of decryptPassphraseWithPassword', () => {
			const decryptedPassphrase = crypto.decryptPassphrase(input);
			return expect(decryptedPassphrase.passphrase).to.equal(result);
		});

		it('should call parseEncryptedPassphrase', () => {
			crypto.decryptPassphrase(input);
			return expect(
				elements.cryptography.parseEncryptedPassphrase,
			).to.be.calledWithExactly(input.encryptedPassphrase);
		});

		it('should call decryptPassphraseWithPassword', () => {
			crypto.decryptPassphrase(input);
			return expect(
				elements.cryptography.decryptPassphraseWithPassword,
			).to.be.calledWithExactly(passphraseObject, input.password);
		});
	});

	describe('#getKeys', () => {
		const result = {
			publicKey: 'publicKey',
			privateKey: 'privateKey',
		};
		const input = 'passphrase';

		beforeEach(() => {
			return sandbox.stub(elements.cryptography, 'getKeys').returns(result);
		});

		it('keys should equal to the result of getKeys', () => {
			const keys = crypto.getKeys(input);
			return expect(keys).to.equal(result);
		});

		it('should call getKeys', () => {
			crypto.getKeys(input);
			return expect(elements.cryptography.getKeys).to.be.calledWithExactly(
				input,
			);
		});
	});

	describe('#getAddressFromPublicKey', () => {
		const result = 'address';
		const input = 'publicKey';

		beforeEach(() => {
			return sandbox
				.stub(elements.cryptography, 'getAddressFromPublicKey')
				.returns(result);
		});

		it('address should equal to the result of getAddressFromPublicKey', () => {
			const addressObject = crypto.getAddressFromPublicKey(input);
			return expect(addressObject.address).to.equal(result);
		});

		it('should call getAddressFromPublicKey', () => {
			crypto.getAddressFromPublicKey(input);
			return expect(
				elements.cryptography.getAddressFromPublicKey,
			).to.be.calledWithExactly(input);
		});
	});

	describe('#signMessage', () => {
		const result = 'signedMessage';
		const input = {
			message: 'message',
			passphrase: 'passphrase',
		};

		beforeEach(() => {
			return sandbox
				.stub(elements.cryptography, 'signMessageWithPassphrase')
				.returns(result);
		});

		it('singed message should equal to the result of signMessageWithPassphrase', () => {
			const signedMessage = crypto.signMessage(input);
			return expect(signedMessage).to.equal(result);
		});

		it('should call signMessageWithPassphrase', () => {
			crypto.signMessage(input);
			return expect(
				elements.cryptography.signMessageWithPassphrase,
			).to.be.calledWithExactly(input.message, input.passphrase);
		});
	});

	describe('#verifyMessage', () => {
		const result = true;
		const input = {
			publicKey: 'publicKey',
			signature: 'signature',
			message: 'message',
		};

		beforeEach(() => {
			return sandbox
				.stub(elements.cryptography, 'verifyMessageWithPublicKey')
				.returns(result);
		});

		it('verified should equal to the result of verifyMessageWithPublicKey', () => {
			const verifiedResult = crypto.verifyMessage(input);
			return expect(verifiedResult.verified).to.equal(result);
		});

		it('should call verifyMessageWithPublicKey', () => {
			crypto.verifyMessage(input);
			return expect(
				elements.cryptography.verifyMessageWithPublicKey,
			).to.be.calledWithExactly(input);
		});
	});
});
