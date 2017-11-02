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
import {
	getFirstQuotedString,
} from '../utils';

export function itShouldNotGetTheKeysForThePassphrase() {
	return (cryptoInstance.getKeys).should.not.be.called();
}

export function itShouldGetTheKeysForThePassphrase() {
	const { passphrase } = this.test.ctx;
	return (cryptoInstance.getKeys).should.be.calledWithExactly(passphrase);
}

export function itShouldResolveToTheResultOfDecryptingThePassphrase() {
	const { returnValue, cryptoResult } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(cryptoResult);
}

export function itShouldDecryptThePassphraseUsingTheIVAndThePassword() {
	const { cipherAndIv, password } = this.test.ctx;
	return (cryptoInstance.decryptPassphrase).should.be.calledWithExactly(cipherAndIv, password);
}

export function itShouldResolveToTheResultOfEncryptingThePassphraseCombinedWithThePublicKey() {
	const { returnValue, cryptoResult, publicKey } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(Object.assign({}, cryptoResult, { publicKey }));
}

export function itShouldEncryptThePassphraseUsingThePassword() {
	const { passphrase, password } = this.test.ctx;
	return (cryptoInstance.encryptPassphrase).should.be.calledWithExactly(passphrase, password);
}

export function itShouldResolveToTheResultOfEncryptingThePassphrase() {
	const { returnValue, cryptoResult } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(cryptoResult);
}

export function itShouldDecryptTheMessageUsingTheNonceThePassphraseAndTheSenderPublicKey() {
	const { message, nonce, passphrase, senderPublicKey } = this.test.ctx;
	return (cryptoInstance.decryptMessage).should.be.calledWithExactly(message, nonce, passphrase, senderPublicKey);
}

export function itShouldResolveToTheResultOfDecryptingTheMessage() {
	const { returnValue, cryptoResult } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(cryptoResult);
}

export function itShouldEncryptTheMessageWithThePassphraseForTheRecipient() {
	const { message, passphrase, recipient } = this.test.ctx;
	return (cryptoInstance.encryptMessage).should.be.calledWithExactly(message, passphrase, recipient);
}

export function itShouldResolveToTheResultOfEncryptingTheMessage() {
	const { returnValue, cryptoResult } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(cryptoResult);
}

export function itShouldResolveToAnObjectWithThePassphraseAndThePublicKeyAndTheAddress() {
	const { returnValue, passphrase, keys: { publicKey }, address } = this.test.ctx;
	const expectedObject = {
		passphrase,
		publicKey,
		address,
	};
	return (returnValue).should.be.fulfilledWith(expectedObject);
}

export function liskJSCryptoShouldBeUsedToGetTheAddressFromThePublicKey() {
	const { keys: { publicKey } } = this.test.ctx;
	return (lisk.crypto.getAddressFromPublicKey).should.be.calledWithExactly(publicKey);
}

export function theCryptoInstanceShouldHaveName() {
	const { cryptoInstance: crypto } = this.test.ctx;
	const name = getFirstQuotedString(this.test.title);
	return (crypto.constructor).should.have.property('name').equal(name);
}

export function theCryptoInstanceShouldHaveLiskJSAsAProperty() {
	const { cryptoInstance: crypto } = this.test.ctx;
	return (crypto).should.have.property('liskCrypto').equal(lisk.crypto);
}

export function liskJSCryptoShouldBeUsedToGetTheKeysForThePassphrase() {
	const { passphrase } = this.test.ctx;
	return (lisk.crypto.getKeys).should.be.calledWithExactly(passphrase);
}

export function theKeysShouldBeReturned() {
	const { returnValue, keys } = this.test.ctx;
	return (returnValue).should.eql(keys);
}

export function theErrorResponseShouldBeHandled() {
	const { returnValue, errorMessage } = this.test.ctx;
	return (returnValue).should.eql({ error: errorMessage });
}

export function liskJSCryptoShouldBeUsedToGetTheEncryptedPassphraseAndIV() {
	const { passphrase, password } = this.test.ctx;
	return (lisk.crypto.encryptPassphraseWithPassword).should.be.calledWithExactly(passphrase, password);
}

export function theEncryptedPassphraseAndIVShouldBeReturned() {
	const { returnValue, cipherAndIv } = this.test.ctx;
	return (returnValue).should.eql(cipherAndIv);
}

export function liskJSCryptoShouldBeUsedToGetTheDecryptedPassphrase() {
	const { cipherAndIv, password } = this.test.ctx;
	return (lisk.crypto.decryptPassphraseWithPassword).should.be.calledWithExactly(cipherAndIv, password);
}

export function theDecryptedPassphraseShouldBeReturned() {
	const { returnValue, passphrase } = this.test.ctx;
	return (returnValue).should.eql({ passphrase });
}

export function liskJSCryptoShouldBeUsedToGetTheEncryptedMessageAndNonce() {
	const { message, passphrase, recipientKeys } = this.test.ctx;
	return (lisk.crypto.encryptMessageWithSecret).should.be.calledWithExactly(message, passphrase, recipientKeys.publicKey);
}

export function theEncryptedMessageAndNonceShouldBeReturned() {
	const { returnValue, encryptedMessageWithNonce } = this.test.ctx;
	return (returnValue).should.eql(encryptedMessageWithNonce);
}

export function liskJSCryptoShouldBeUsedToGetTheDecryptedMessage() {
	const { encryptedMessageWithNonce: { encryptedMessage, nonce }, recipientPassphrase, keys } = this.test.ctx;
	return (lisk.crypto.decryptMessageWithSecret).should.be.calledWithExactly(encryptedMessage, nonce, recipientPassphrase, keys.publicKey);
}

export function theDecryptedMessageShouldBeReturned() {
	const { returnValue, message } = this.test.ctx;
	return (returnValue).should.eql({ message });
}

export function itShouldResolveToThePassphrase() {
	const { returnValue, passphrase } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(passphrase);
}

export function itShouldReturnAnObjectWithThePassphrase() {
	const { returnValue, passphrase } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith({
		passphrase,
	});
}

export function itShouldReturnAnObjectWithTheData() {
	const { returnValue, data } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith({
		passphrase: null,
		data,
	});
}

export function itShouldReturnAnObjectWithThePassphraseAndTheData() {
	const { returnValue, passphrase, data } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith({
		passphrase,
		data,
	});
}
