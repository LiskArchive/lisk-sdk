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
import { DEFAULT_ERROR_MESSAGE } from '../utils';

export function anErrorOccursAttemptingToVerifyTheMessageUsingThePublicKeyAndTheSignature() {
	const { cryptoInstance, publicKey, message, signature } = this.test.ctx;

	lisk.crypto.verifyMessageWithPublicKey.throws(
		new TypeError(DEFAULT_ERROR_MESSAGE),
	);

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptoInstance.verifyMessage({
		publicKey,
		signature,
		message,
	});
}

export function noErrorOccursAttemptingToVerifyTheMessageUsingThePublicKeyAndTheSignature() {
	const { cryptoInstance, message, publicKey, signature } = this.test.ctx;
	const verifyReturnMessage = true;

	lisk.crypto.verifyMessageWithPublicKey.returns(verifyReturnMessage);

	this.test.ctx.returnValue = cryptoInstance.verifyMessage({
		publicKey,
		signature,
		message,
	});
}

export function noErrorOccursAttemptingToSignTheMessageUsingThePassphrase() {
	const { cryptography, message, passphrase, signature } = this.test.ctx;

	lisk.crypto.signMessageWithPassphrase.returns(signature);

	this.test.ctx.returnValue = cryptography.signMessage({
		message,
		passphrase,
	});
}

export function anErrorOccursAttemptingToSignTheMessageUsingThePassphrase() {
	const { cryptography, message, passphrase } = this.test.ctx;

	lisk.crypto.signMessageWithPassphrase.throws(
		new TypeError(DEFAULT_ERROR_MESSAGE),
	);

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptography.signMessage({
		message,
		passphrase,
	});
}

export function anErrorOccursAttemptingToGetTheAddressFromThePublicKey() {
	const { cryptography, keys: { publicKey } } = this.test.ctx;

	lisk.crypto.getAddressFromPublicKey.throws(
		new TypeError(DEFAULT_ERROR_MESSAGE),
	);

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptography.getAddressFromPublicKey(publicKey);
}

export function noErrorOccursAttemptingToGetTheAddressFromThePublicKey() {
	const { cryptography, keys: { publicKey }, address } = this.test.ctx;
	lisk.crypto.getAddressFromPublicKey.returns(address);
	this.test.ctx.returnValue = cryptography.getAddressFromPublicKey(publicKey);
}

export function noErrorOccursAttemptingToGetTheKeysForThePassphrase() {
	const { cryptography, passphrase } = this.test.ctx;
	this.test.ctx.returnValue = cryptography.getKeys(passphrase);
}

export function anErrorOccursAttemptingToGetTheKeysForThePassphrase() {
	const { cryptography, passphrase } = this.test.ctx;

	lisk.crypto.getKeys.throws(new TypeError(DEFAULT_ERROR_MESSAGE));

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptography.getKeys(passphrase);
}

export function noErrorOccursAttemptingToEncryptThePassphraseWithThePassword() {
	const { cryptography, passphrase, password } = this.test.ctx;
	this.test.ctx.returnValue = cryptography.encryptPassphrase({
		passphrase,
		password,
	});
}

export function anErrorOccursAttemptingToEncryptThePassphraseWithThePassword() {
	const { cryptography, passphrase, password } = this.test.ctx;

	lisk.crypto.encryptPassphraseWithPassword.throws(
		new TypeError(DEFAULT_ERROR_MESSAGE),
	);

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptography.encryptPassphrase({
		passphrase,
		password,
	});
}

export function noErrorOccursAttemptingToDecryptThePassphraseWithThePassword() {
	const { cryptography, cipherAndIv: { cipher, iv }, password } = this.test.ctx;
	this.test.ctx.returnValue = cryptography.decryptPassphrase({
		cipher,
		iv,
		password,
	});
}

export function anErrorOccursAttemptingToDecryptThePassphraseWithThePassword() {
	const { cryptography, cipherAndIv: { cipher, iv }, password } = this.test.ctx;

	lisk.crypto.decryptPassphraseWithPassword.throws(
		new TypeError(DEFAULT_ERROR_MESSAGE),
	);

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptography.decryptPassphrase({
		cipher,
		iv,
		password,
	});
}

export function noErrorOccursAttemptingToEncryptTheMessageForTheRecipientUsingThePassphrase() {
	const { cryptography, message, passphrase, recipientKeys } = this.test.ctx;
	this.test.ctx.returnValue = cryptography.encryptMessage({
		message,
		passphrase,
		recipient: recipientKeys.publicKey,
	});
}

export function anErrorOccursAttemptingToEncryptTheMessageForTheRecipientUsingThePassphrase() {
	const { cryptography, message, passphrase, recipientKeys } = this.test.ctx;

	lisk.crypto.encryptMessageWithPassphrase.throws(
		new TypeError(DEFAULT_ERROR_MESSAGE),
	);

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptography.encryptMessage({
		message,
		passphrase,
		recipient: recipientKeys.publicKey,
	});
}

export function noErrorOccursAttemptingToDecryptTheMessageUsingTheRecipientPassphraseAndSenderPublicKey() {
	const {
		cryptography,
		cipherAndNonce: { cipher, nonce },
		recipientPassphrase,
		keys,
	} = this.test.ctx;
	this.test.ctx.returnValue = cryptography.decryptMessage({
		cipher,
		nonce,
		passphrase: recipientPassphrase,
		senderPublicKey: keys.publicKey,
	});
}

export function anErrorOccursAttemptingToDecryptTheMessageUsingTheRecipientPassphraseAndSenderPublicKey() {
	const {
		cryptography,
		cipherAndNonce: { cipher, nonce },
		recipientPassphrase,
		keys,
	} = this.test.ctx;

	lisk.crypto.decryptMessageWithPassphrase.throws(
		new TypeError(DEFAULT_ERROR_MESSAGE),
	);

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptography.decryptMessage({
		cipher,
		nonce,
		recipientPassphrase,
		senderPublicKey: keys.publicKey,
	});
}
