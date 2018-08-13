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
import cryptography from '../../../src/utils/cryptography';
import { getFirstQuotedString } from '../utils';

export function theMessageVerificationShouldBeReturned() {
	const { returnValue } = this.test.ctx;
	const verification = { verified: true };
	return expect(returnValue).to.be.eql(verification);
}

export function liskElementsCryptoShouldBeUsedToVerifyTheMessage() {
	const { message, keys: { publicKey }, signature } = this.test.ctx;
	return expect(
		elements.cryptography.verifyMessageWithPublicKey,
	).to.be.calledWithExactly({
		publicKey,
		signature,
		message,
	});
}

export function itShouldResolveToTheResultOfVerifyingTheMessage() {
	const { returnValue, cryptoResult } = this.test.ctx;
	return expect(returnValue).to.eventually.equal(cryptoResult);
}

export function itShouldSignTheMessageWithThePassphrase() {
	const { message, passphrase } = this.test.ctx;
	return expect(cryptography.signMessage).to.be.calledWithExactly({
		message,
		passphrase,
	});
}

export function itShouldResolveToTheResultOfSigningTheMessage() {
	const { returnValue, cryptoResult } = this.test.ctx;
	return expect(returnValue).to.eventually.equal(cryptoResult);
}

export function itShouldResolveToTheResultOfDecryptingThePassphrase() {
	const { returnValue, cryptoResult } = this.test.ctx;
	return expect(returnValue).to.eventually.equal(cryptoResult);
}

export function itShouldDecryptThePassphraseUsingThePassword() {
	const { encryptedPassphrase, password } = this.test.ctx;
	return expect(cryptography.decryptPassphrase).to.be.calledWithExactly({
		encryptedPassphrase,
		password,
	});
}

export function itShouldResolveToTheResultOfEncryptingThePassphraseCombinedWithThePublicKey() {
	const { returnValue, cryptoResult, publicKey } = this.test.ctx;
	return expect(returnValue).to.eventually.eql(
		Object.assign({}, cryptoResult, { publicKey }),
	);
}

export function itShouldEncryptThePassphraseUsingThePassword() {
	const { passphrase, password } = this.test.ctx;
	return expect(cryptography.encryptPassphrase).to.be.calledWithExactly({
		passphrase,
		password,
	});
}

export function itShouldResolveToTheResultOfEncryptingThePassphrase() {
	const { returnValue, cryptoResult } = this.test.ctx;
	return expect(returnValue).to.eventually.equal(cryptoResult);
}

export function itShouldDecryptTheMessageUsingTheNonceThePassphraseAndTheSenderPublicKey() {
	const { message, nonce, passphrase, senderPublicKey } = this.test.ctx;
	return expect(cryptography.decryptMessage).to.be.calledWithExactly({
		cipher: message,
		nonce,
		passphrase,
		senderPublicKey,
	});
}

export function itShouldResolveToTheResultOfDecryptingTheMessage() {
	const { returnValue, cryptoResult } = this.test.ctx;
	return expect(returnValue).to.eventually.equal(cryptoResult);
}

export function itShouldEncryptTheMessageWithThePassphraseForTheRecipient() {
	const { message, passphrase, recipient } = this.test.ctx;
	return expect(cryptography.encryptMessage).to.be.calledWithExactly({
		message,
		passphrase,
		recipient,
	});
}

export function itShouldResolveToTheResultOfEncryptingTheMessage() {
	const { returnValue, cryptoResult } = this.test.ctx;
	return expect(returnValue).to.eventually.equal(cryptoResult);
}

export function itShouldResolveToAnObjectWithThePrivateKeyThePublicKeyAndTheAddress() {
	const {
		returnValue,
		keys: { privateKey, publicKey },
		address,
	} = this.test.ctx;
	const expectedObject = {
		publicKey,
		privateKey,
		address,
	};
	return expect(returnValue).to.eventually.eql(expectedObject);
}

export function itShouldResolveToAnObjectWithThePassphraseThePrivateKeyThePublicKeyAndTheAddress() {
	const {
		returnValue,
		passphrase,
		keys: { privateKey, publicKey },
		address,
	} = this.test.ctx;
	const expectedObject = {
		passphrase,
		privateKey,
		publicKey,
		address,
	};
	return expect(returnValue).to.eventually.eql(expectedObject);
}

export function theSignatureShouldBeReturned() {
	const { returnValue, signature } = this.test.ctx;
	return expect(returnValue).to.be.equal(signature);
}

export function liskElementsCryptoShouldBeUsedToSignTheMessage() {
	const { message, passphrase } = this.test.ctx;
	return expect(
		elements.cryptography.signMessageWithPassphrase,
	).to.be.calledWithExactly(message, passphrase);
}

export function liskElementsCryptoShouldBeUsedToGetTheAddressFromThePublicKey() {
	const { keys: { publicKey } } = this.test.ctx;
	return expect(
		elements.cryptography.getAddressFromPublicKey,
	).to.be.calledWithExactly(publicKey);
}

export function theCryptoInstanceShouldHaveName() {
	const { cryptography: crypto } = this.test.ctx;
	const name = getFirstQuotedString(this.test.title);
	return expect(crypto.constructor)
		.to.have.property('name')
		.equal(name);
}

export function theCryptoInstanceShouldHaveLiskElementsCryptographyAsAProperty() {
	const { cryptography: crypto } = this.test.ctx;
	return expect(crypto)
		.to.have.property('liskCrypto')
		.equal(elements.cryptography);
}

export function liskElementsCryptoShouldBeUsedToGetTheKeysForThePassphrase() {
	const { passphrase } = this.test.ctx;
	return expect(elements.cryptography.getKeys).to.be.calledWithExactly(
		passphrase,
	);
}

export function theKeysShouldBeReturned() {
	const { returnValue, keys } = this.test.ctx;
	return expect(returnValue).to.equal(keys);
}

export function theErrorResponseShouldBeHandled() {
	const { returnValue, errorMessage } = this.test.ctx;
	return expect(returnValue).to.eql({ error: errorMessage });
}

export function liskElementsCryptoShouldBeUsedToGetTheEncryptedPassphrase() {
	const { passphrase, password } = this.test.ctx;
	return expect(
		elements.cryptography.encryptPassphraseWithPassword,
	).to.be.calledWithExactly(passphrase, password);
}

export function liskElementsCryptoShouldBeUsedToStringifyTheEncryptedPassphrase() {
	const { encryptedPassphraseObject } = this.test.ctx;
	return expect(
		elements.cryptography.stringifyEncryptedPassphrase,
	).to.be.calledWithExactly(encryptedPassphraseObject);
}

export function liskElementsCryptoShouldBeUsedToParseTheEncryptedPassphrase() {
	const { encryptedPassphrase } = this.test.ctx;
	return expect(
		elements.cryptography.parseEncryptedPassphrase,
	).to.be.calledWithExactly(encryptedPassphrase);
}

export function theEncryptedPassphraseShouldBeReturned() {
	const { returnValue, encryptedPassphrase } = this.test.ctx;
	return expect(returnValue).to.eql({ encryptedPassphrase });
}

export function liskElementsCryptoShouldBeUsedToGetTheDecryptedPassphrase() {
	const { encryptedPassphraseObject, password } = this.test.ctx;
	return expect(
		elements.cryptography.decryptPassphraseWithPassword,
	).to.be.calledWithExactly(encryptedPassphraseObject, password);
}

export function theDecryptedPassphraseShouldBeReturned() {
	const { returnValue, passphrase } = this.test.ctx;
	return expect(returnValue).to.eql({ passphrase });
}

export function liskElementsCryptoShouldBeUsedToGetTheEncryptedMessageAndNonce() {
	const { message, passphrase, recipientKeys } = this.test.ctx;
	return expect(
		elements.cryptography.encryptMessageWithPassphrase,
	).to.be.calledWithExactly(message, passphrase, recipientKeys.publicKey);
}

export function theEncryptedMessageAndNonceShouldBeReturned() {
	const { returnValue, cipherAndNonce } = this.test.ctx;
	return expect(returnValue).to.equal(cipherAndNonce);
}

export function liskElementsCryptoShouldBeUsedToGetTheDecryptedMessage() {
	const {
		cipherAndNonce: { cipher, nonce },
		recipientPassphrase,
		keys,
	} = this.test.ctx;
	return expect(
		elements.cryptography.decryptMessageWithPassphrase,
	).to.be.calledWithExactly(cipher, nonce, recipientPassphrase, keys.publicKey);
}

export function theDecryptedMessageShouldBeReturned() {
	const { returnValue, message } = this.test.ctx;
	return expect(returnValue).to.eql({ message });
}

export function itShouldResolveToThePassphrase() {
	const { returnValue, passphrase } = this.test.ctx;
	return expect(returnValue).to.eventually.equal(passphrase);
}

export function itShouldReturnAnObjectWithThePassphrase() {
	const { returnValue, passphrase } = this.test.ctx;
	return expect(returnValue).to.eventually.eql({
		passphrase,
		secondPassphrase: null,
		password: null,
		data: null,
	});
}

export function itShouldReturnAnObjectWithTheSecondPassphrase() {
	const { returnValue, secondPassphrase } = this.test.ctx;
	return expect(returnValue).to.eventually.eql({
		passphrase: null,
		secondPassphrase,
		password: null,
		data: null,
	});
}

export function itShouldReturnAnObjectWithThePassword() {
	const { returnValue, password } = this.test.ctx;
	return expect(returnValue).to.eventually.eql({
		passphrase: null,
		secondPassphrase: null,
		password,
		data: null,
	});
}

export function itShouldReturnAnObjectWithTheData() {
	const { returnValue, data } = this.test.ctx;
	return expect(returnValue).to.eventually.eql({
		passphrase: null,
		secondPassphrase: null,
		password: null,
		data,
	});
}

export function itShouldReturnAnObjectWithThePassphraseTheSecondPassphraseThePasswordAndTheData() {
	const {
		returnValue,
		passphrase,
		secondPassphrase,
		password,
		data,
	} = this.test.ctx;
	return expect(returnValue).to.eventually.eql({
		passphrase,
		secondPassphrase,
		password,
		data,
	});
}
