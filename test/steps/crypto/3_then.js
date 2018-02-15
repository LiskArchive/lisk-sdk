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
import cryptoInstance from '../../../src/utils/cryptoModule';
import { getFirstQuotedString } from '../utils';

export function itShouldSignTheMessageWithThePassphrase() {
	const { message, passphrase } = this.test.ctx;
	return cryptoInstance.signMessage.should.be.calledWithExactly({
		message,
		passphrase,
	});
}

export function itShouldResolveToTheResultOfSigningTheMessage() {
	const { returnValue, cryptoResult } = this.test.ctx;
	return returnValue.should.eventually.eql(cryptoResult);
}

export function itShouldResolveToTheResultOfDecryptingThePassphrase() {
	const { returnValue, cryptoResult } = this.test.ctx;
	return returnValue.should.eventually.eql(cryptoResult);
}

export function itShouldDecryptThePassphraseUsingTheIVAndThePassword() {
	const { cipherAndIv: { cipher, iv }, password } = this.test.ctx;
	return cryptoInstance.decryptPassphrase.should.be.calledWithExactly({
		cipher,
		iv,
		password,
	});
}

export function itShouldResolveToTheResultOfEncryptingThePassphraseCombinedWithThePublicKey() {
	const { returnValue, cryptoResult, publicKey } = this.test.ctx;
	return returnValue.should.eventually.eql(
		Object.assign({}, cryptoResult, { publicKey }),
	);
}

export function itShouldEncryptThePassphraseUsingThePassword() {
	const { passphrase, password } = this.test.ctx;
	return cryptoInstance.encryptPassphrase.should.be.calledWithExactly({
		passphrase,
		password,
	});
}

export function itShouldResolveToTheResultOfEncryptingThePassphrase() {
	const { returnValue, cryptoResult } = this.test.ctx;
	return returnValue.should.eventually.eql(cryptoResult);
}

export function itShouldDecryptTheMessageUsingTheNonceThePassphraseAndTheSenderPublicKey() {
	const { message, nonce, passphrase, senderPublicKey } = this.test.ctx;
	return cryptoInstance.decryptMessage.should.be.calledWithExactly({
		cipher: message,
		nonce,
		passphrase,
		senderPublicKey,
	});
}

export function itShouldResolveToTheResultOfDecryptingTheMessage() {
	const { returnValue, cryptoResult } = this.test.ctx;
	return returnValue.should.eventually.eql(cryptoResult);
}

export function itShouldEncryptTheMessageWithThePassphraseForTheRecipient() {
	const { message, passphrase, recipient } = this.test.ctx;
	return cryptoInstance.encryptMessage.should.be.calledWithExactly({
		message,
		passphrase,
		recipient,
	});
}

export function itShouldResolveToTheResultOfEncryptingTheMessage() {
	const { returnValue, cryptoResult } = this.test.ctx;
	return returnValue.should.eventually.eql(cryptoResult);
}

export function itShouldResolveToAnObjectWithThePassphraseAndThePublicKeyAndTheAddress() {
	const {
		returnValue,
		passphrase,
		keys: { publicKey },
		address,
	} = this.test.ctx;
	const expectedObject = {
		passphrase,
		publicKey,
		address,
	};
	return returnValue.should.eventually.eql(expectedObject);
}

export function theSignatureShouldBeReturned() {
	const { returnValue, signature } = this.test.ctx;
	return returnValue.should.be.eql(signature);
}

export function liskJSCryptoShouldBeUsedToSignTheMessage() {
	const { message, passphrase } = this.test.ctx;
	return lisk.crypto.signMessageWithPassphrase.should.be.calledWithExactly(
		message,
		passphrase,
	);
}

export function liskJSCryptoShouldBeUsedToGetTheAddressFromThePublicKey() {
	const { keys: { publicKey } } = this.test.ctx;
	return lisk.crypto.getAddressFromPublicKey.should.be.calledWithExactly(
		publicKey,
	);
}

export function theCryptoInstanceShouldHaveName() {
	const { cryptoInstance: crypto } = this.test.ctx;
	const name = getFirstQuotedString(this.test.title);
	return crypto.constructor.should.have.property('name').equal(name);
}

export function theCryptoInstanceShouldHaveLiskJSAsAProperty() {
	const { cryptoInstance: crypto } = this.test.ctx;
	return crypto.should.have.property('liskCrypto').equal(lisk.crypto);
}

export function liskJSCryptoShouldBeUsedToGetTheKeysForThePassphrase() {
	const { passphrase } = this.test.ctx;
	return lisk.crypto.getKeys.should.be.calledWithExactly(passphrase);
}

export function theKeysShouldBeReturned() {
	const { returnValue, keys } = this.test.ctx;
	return returnValue.should.eql(keys);
}

export function theErrorResponseShouldBeHandled() {
	const { returnValue, errorMessage } = this.test.ctx;
	return returnValue.should.eql({ error: errorMessage });
}

export function liskJSCryptoShouldBeUsedToGetTheEncryptedPassphraseAndIV() {
	const { passphrase, password } = this.test.ctx;
	return lisk.crypto.encryptPassphraseWithPassword.should.be.calledWithExactly(
		passphrase,
		password,
	);
}

export function theEncryptedPassphraseAndIVShouldBeReturned() {
	const { returnValue, cipherAndIv } = this.test.ctx;
	return returnValue.should.eql(cipherAndIv);
}

export function liskJSCryptoShouldBeUsedToGetTheDecryptedPassphrase() {
	const { cipherAndIv, password } = this.test.ctx;
	return lisk.crypto.decryptPassphraseWithPassword.should.be.calledWithExactly(
		cipherAndIv,
		password,
	);
}

export function theDecryptedPassphraseShouldBeReturned() {
	const { returnValue, passphrase } = this.test.ctx;
	return returnValue.should.eql({ passphrase });
}

export function liskJSCryptoShouldBeUsedToGetTheEncryptedMessageAndNonce() {
	const { message, passphrase, recipientKeys } = this.test.ctx;
	return lisk.crypto.encryptMessageWithPassphrase.should.be.calledWithExactly(
		message,
		passphrase,
		recipientKeys.publicKey,
	);
}

export function theEncryptedMessageAndNonceShouldBeReturned() {
	const { returnValue, cipherAndNonce } = this.test.ctx;
	return returnValue.should.eql(cipherAndNonce);
}

export function liskJSCryptoShouldBeUsedToGetTheDecryptedMessage() {
	const {
		cipherAndNonce: { cipher, nonce },
		recipientPassphrase,
		keys,
	} = this.test.ctx;
	return lisk.crypto.decryptMessageWithPassphrase.should.be.calledWithExactly(
		cipher,
		nonce,
		recipientPassphrase,
		keys.publicKey,
	);
}

export function theDecryptedMessageShouldBeReturned() {
	const { returnValue, message } = this.test.ctx;
	return returnValue.should.eql({ message });
}

export function itShouldResolveToThePassphrase() {
	const { returnValue, passphrase } = this.test.ctx;
	return returnValue.should.eventually.eql(passphrase);
}

export function itShouldReturnAnObjectWithThePassphrase() {
	const { returnValue, passphrase } = this.test.ctx;
	return returnValue.should.eventually.eql({
		passphrase,
		secondPassphrase: null,
		password: null,
		data: null,
	});
}

export function itShouldReturnAnObjectWithTheSecondPassphrase() {
	const { returnValue, secondPassphrase } = this.test.ctx;
	return returnValue.should.eventually.eql({
		passphrase: null,
		secondPassphrase,
		password: null,
		data: null,
	});
}

export function itShouldReturnAnObjectWithThePassword() {
	const { returnValue, password } = this.test.ctx;
	return returnValue.should.eventually.eql({
		passphrase: null,
		secondPassphrase: null,
		password,
		data: null,
	});
}

export function itShouldReturnAnObjectWithTheData() {
	const { returnValue, data } = this.test.ctx;
	return returnValue.should.eventually.eql({
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
	return returnValue.should.eventually.eql({
		passphrase,
		secondPassphrase,
		password,
		data,
	});
}
