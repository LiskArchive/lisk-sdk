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
import crypto from '../../src/utils/cryptography';
// Required for stubbing
const elements = require('lisk-elements');

describe('crypto utils', () => {
	describe('elements throws error', () => {
		const errorMessage = 'some error';
		beforeEach(() => {
			return sandbox
				.stub(elements.default.cryptography, 'encryptMessageWithPassphrase')
				.throws(new Error(errorMessage));
		});

		it('should result in error object with the errorMessage', () => {
			const result = crypto.encryptMessage('random input');
			expect(result).to.be.an('Object');
			return expect(result.error).to.eql(errorMessage);
		});
	});

	describe('#encryptMessage', () => {
		let result;
		let cryptoStub;
		beforeEach(() => {
			result = {
				result: 'result',
			};
			cryptoStub = sandbox
				.stub(elements.default.cryptography, 'encryptMessageWithPassphrase')
				.returns(result);
			return Promise.resolve(true);
		});

		it('should call encryptMessageWithPassphrase', () => {
			const input = {
				message: 'msg',
				passphrase: 'random-passphrase',
				recipient: 'recipient',
			};
			const encryptedMessage = crypto.encryptMessage(input);

			expect(encryptedMessage).to.equal(result);
			return expect(cryptoStub).to.be.calledWithExactly(
				input.message,
				input.passphrase,
				input.recipient,
			);
		});
	});

	describe('#decryptMessage', () => {
		let result;
		let cryptoStub;
		beforeEach(() => {
			result = 'message';
			cryptoStub = sandbox
				.stub(elements.default.cryptography, 'decryptMessageWithPassphrase')
				.returns(result);
			return Promise.resolve(true);
		});

		it('should call decryptMessageWithPassphrase', () => {
			const input = {
				cipher: 'cipher',
				nonce: 'nonce',
				passphrase: 'random-passphrase',
				senderPublicKey: 'recipient',
			};
			const decryptedMessage = crypto.decryptMessage(input);

			expect(decryptedMessage.message).to.equal(result);
			return expect(cryptoStub).to.be.calledWithExactly(
				input.cipher,
				input.nonce,
				input.passphrase,
				input.senderPublicKey,
			);
		});
	});

	describe('#encryptPassphrase', () => {
		let result;
		let passphraseObject;
		let encryptPassphraseStub;
		let stringifyPassphraseStub;
		beforeEach(() => {
			result = 'encryptedPassphrase';
			passphraseObject = {
				iterations: 1,
				cipherText: 'cipher',
				iv: 'iv',
				salt: 'salt',
				tag: 'tag',
				version: '1',
			};
			encryptPassphraseStub = sandbox
				.stub(elements.default.cryptography, 'encryptPassphraseWithPassword')
				.returns(passphraseObject);
			stringifyPassphraseStub = sandbox
				.stub(elements.default.cryptography, 'stringifyEncryptedPassphrase')
				.returns(result);
			return Promise.resolve(true);
		});

		it('should call encryptPassphrase', () => {
			const input = {
				passphrase: 'random-passphrase',
				password: 'password',
			};
			const encryptedPassphrase = crypto.encryptPassphrase(input);

			expect(encryptedPassphrase.encryptedPassphrase).to.equal(result);
			expect(encryptPassphraseStub).to.be.calledWithExactly(
				input.passphrase,
				input.password,
			);
			return expect(stringifyPassphraseStub).to.be.calledWithExactly(
				passphraseObject,
			);
		});
	});

	describe('#decryptPassphrase', () => {
		let result;
		let passphraseObject;
		let parseEncryptedPassphraseStub;
		let decryptPassphraseStub;
		beforeEach(() => {
			result = 'passphrase';
			passphraseObject = {
				iterations: 1,
				cipherText: 'cipher',
				iv: 'iv',
				salt: 'salt',
				tag: 'tag',
				version: '1',
			};
			parseEncryptedPassphraseStub = sandbox
				.stub(elements.default.cryptography, 'parseEncryptedPassphrase')
				.returns(passphraseObject);
			decryptPassphraseStub = sandbox
				.stub(elements.default.cryptography, 'decryptPassphraseWithPassword')
				.returns(result);
			return Promise.resolve(true);
		});

		it('should call decryptPassphrase', () => {
			const input = {
				encryptedPassphrase: 'random-passphrase',
				password: 'password',
			};
			const decryptedPassphrase = crypto.decryptPassphrase(input);

			expect(decryptedPassphrase.passphrase).to.equal(result);
			expect(parseEncryptedPassphraseStub).to.be.calledWithExactly(
				input.encryptedPassphrase,
			);
			return expect(decryptPassphraseStub).to.be.calledWithExactly(
				passphraseObject,
				input.password,
			);
		});
	});

	describe('#getKeys', () => {
		let result;
		let cryptoStub;
		beforeEach(() => {
			result = {
				publicKey: 'publicKey',
				privateKey: 'privateKey',
			};
			cryptoStub = sandbox
				.stub(elements.default.cryptography, 'getKeys')
				.returns(result);
			return Promise.resolve(true);
		});

		it('should call getKeys', () => {
			const input = 'passphrase';
			const keys = crypto.getKeys(input);

			expect(keys).to.equal(result);
			return expect(cryptoStub).to.be.calledWithExactly(input);
		});
	});

	describe('#getAddressFromPublicKey', () => {
		let result;
		let cryptoStub;
		beforeEach(() => {
			result = 'address';
			cryptoStub = sandbox
				.stub(elements.default.cryptography, 'getAddressFromPublicKey')
				.returns(result);
			return Promise.resolve(true);
		});

		it('should call getAddressFromPublicKey', () => {
			const input = 'publicKey';
			const addressObject = crypto.getAddressFromPublicKey(input);

			expect(addressObject.address).to.equal(result);
			return expect(cryptoStub).to.be.calledWithExactly(input);
		});
	});

	describe('#signMessage', () => {
		let result;
		let cryptoStub;
		beforeEach(() => {
			result = 'signedMessage';
			cryptoStub = sandbox
				.stub(elements.default.cryptography, 'signMessageWithPassphrase')
				.returns(result);
			return Promise.resolve(true);
		});

		it('should call signMessageWithPassphrase', () => {
			const input = {
				message: 'message',
				passphrase: 'passphrase',
			};
			const signedMessage = crypto.signMessage(input);

			expect(signedMessage).to.equal(result);
			return expect(cryptoStub).to.be.calledWithExactly(
				input.message,
				input.passphrase,
			);
		});
	});

	describe('#verifyMessage', () => {
		let result;
		let cryptoStub;
		beforeEach(() => {
			result = true;
			cryptoStub = sandbox
				.stub(elements.default.cryptography, 'verifyMessageWithPublicKey')
				.returns(result);
			return Promise.resolve(true);
		});

		it('should call verifyMessageWithPublicKey', () => {
			const input = {
				publicKey: 'publicKey',
				signature: 'signature',
				message: 'message',
			};
			const verifiedResult = crypto.verifyMessage(input);

			expect(verifiedResult.verified).to.equal(result);
			return expect(cryptoStub).to.be.calledWithExactly(input);
		});
	});
});
