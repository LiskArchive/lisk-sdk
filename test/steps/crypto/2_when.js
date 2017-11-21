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

export function anErrorOccursAttemptingToGetTheAddressFromThePublicKey() {
	const { cryptoInstance, keys: { publicKey } } = this.test.ctx;

	lisk.crypto.getAddressFromPublicKey.throws(
		new TypeError(DEFAULT_ERROR_MESSAGE),
	);

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptoInstance.getAddressFromPublicKey(publicKey);
}

export function noErrorOccursAttemptingToGetTheAddressFromThePublicKey() {
	const { cryptoInstance, keys: { publicKey }, address } = this.test.ctx;
	lisk.crypto.getAddressFromPublicKey.returns(address);
	this.test.ctx.returnValue = cryptoInstance.getAddressFromPublicKey(publicKey);
}

export function noErrorOccursAttemptingToGetTheKeysForThePassphrase() {
	const { cryptoInstance, passphrase } = this.test.ctx;
	this.test.ctx.returnValue = cryptoInstance.getKeys(passphrase);
}

export function anErrorOccursAttemptingToGetTheKeysForThePassphrase() {
	const { cryptoInstance, passphrase } = this.test.ctx;

	lisk.crypto.getKeys.throws(new TypeError(DEFAULT_ERROR_MESSAGE));

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptoInstance.getKeys(passphrase);
}

export function noErrorOccursAttemptingToEncryptThePassphraseWithThePassword() {
	const { cryptoInstance, passphrase, password } = this.test.ctx;
	this.test.ctx.returnValue = cryptoInstance.encryptPassphrase({
		passphrase,
		password,
	});
}

export function anErrorOccursAttemptingToEncryptThePassphraseWithThePassword() {
	const { cryptoInstance, passphrase, password } = this.test.ctx;

	lisk.crypto.encryptPassphraseWithPassword.throws(
		new TypeError(DEFAULT_ERROR_MESSAGE),
	);

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptoInstance.encryptPassphrase({
		passphrase,
		password,
	});
}

export function noErrorOccursAttemptingToDecryptThePassphraseWithThePassword() {
	const {
		cryptoInstance,
		cipherAndIv: { cipher, iv },
		password,
	} = this.test.ctx;
	this.test.ctx.returnValue = cryptoInstance.decryptPassphrase({
		cipher,
		iv,
		password,
	});
}

export function anErrorOccursAttemptingToDecryptThePassphraseWithThePassword() {
	const {
		cryptoInstance,
		cipherAndIv: { cipher, iv },
		password,
	} = this.test.ctx;

	lisk.crypto.decryptPassphraseWithPassword.throws(
		new TypeError(DEFAULT_ERROR_MESSAGE),
	);

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptoInstance.decryptPassphrase({
		cipher,
		iv,
		password,
	});
}

export function noErrorOccursAttemptingToEncryptTheMessageForTheRecipientUsingThePassphrase() {
	const { cryptoInstance, message, passphrase, recipientKeys } = this.test.ctx;
	this.test.ctx.returnValue = cryptoInstance.encryptMessage({
		message,
		passphrase,
		recipient: recipientKeys.publicKey,
	});
}

export function anErrorOccursAttemptingToEncryptTheMessageForTheRecipientUsingThePassphrase() {
	const { cryptoInstance, message, passphrase, recipientKeys } = this.test.ctx;

	lisk.crypto.encryptMessageWithPassphrase.throws(
		new TypeError(DEFAULT_ERROR_MESSAGE),
	);

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptoInstance.encryptMessage({
		message,
		passphrase,
		recipient: recipientKeys.publicKey,
	});
}

export function noErrorOccursAttemptingToDecryptTheMessageUsingTheRecipientPassphraseAndSenderPublicKey() {
	const {
		cryptoInstance,
		cipherAndNonce: { cipher, nonce },
		recipientPassphrase,
		keys,
	} = this.test.ctx;
	this.test.ctx.returnValue = cryptoInstance.decryptMessage({
		cipher,
		nonce,
		passphrase: recipientPassphrase,
		senderPublicKey: keys.publicKey,
	});
}

export function anErrorOccursAttemptingToDecryptTheMessageUsingTheRecipientPassphraseAndSenderPublicKey() {
	const {
		cryptoInstance,
		cipherAndNonce: { cipher, nonce },
		recipientPassphrase,
		keys,
	} = this.test.ctx;

	lisk.crypto.decryptMessageWithPassphrase.throws(
		new TypeError(DEFAULT_ERROR_MESSAGE),
	);

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptoInstance.decryptMessage({
		cipher,
		nonce,
		recipientPassphrase,
		senderPublicKey: keys.publicKey,
	});
}
