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
import * as inputUtils from '../../../src/utils/input/utils';
import { getFirstQuotedString, getQuotedStrings } from '../utils';

export function theMessageUnderThePassphraseHasSignature() {
	const signature = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.signature = signature;
}

export function aCryptoInstance() {
	this.test.ctx.cryptography = cryptography;
}

export function aCryptoInstanceHasBeenInitialised() {
	const cryptoResult = {
		some: 'result',
		testing: 123,
	};
	[
		'encryptMessage',
		'decryptMessage',
		'encryptPassphrase',
		'decryptPassphrase',
		'getKeys',
		'getAddressFromPublicKey',
		'signMessage',
		'verifyMessage',
	].forEach(methodName => cryptography[methodName].returns(cryptoResult));

	this.test.ctx.cryptoResult = cryptoResult;
	this.test.ctx.cryptography = cryptography;
}

export function aSignature() {
	const signature = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.signature = signature;
}

export function aPublicKey() {
	const publicKey = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.publicKey = publicKey;
}

export const aSenderPublicKey = aPublicKey;

export function aNonce() {
	const nonce = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.nonce = nonce;
}

export function anEncryptedMessage() {
	const message = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.message = message;
}

export function aPassphrase() {
	const passphrase = getFirstQuotedString(this.test.parent.title);
	if (typeof inputUtils.getPassphrase.resolves === 'function') {
		inputUtils.getPassphrase.resolves(passphrase);
	}
	this.test.ctx.passphrase = passphrase;
}

export function aSecondPassphrase() {
	const secondPassphrase = getFirstQuotedString(this.test.parent.title);
	if (typeof inputUtils.getPassphrase.resolves === 'function') {
		inputUtils.getPassphrase.onSecondCall().resolves(secondPassphrase);
	}
	this.test.ctx.secondPassphrase = secondPassphrase;
}

export function aPassphraseWithPublicKey() {
	const [passphrase, publicKey] = getQuotedStrings(this.test.parent.title);
	cryptography.getKeys.returns({ publicKey });

	this.test.ctx.passphrase = passphrase;
	this.test.ctx.publicKey = publicKey;
}

export function aPassphraseWithPrivateKeyAndPublicKeyAndAddress() {
	const [passphrase, privateKey, publicKey, address] = getQuotedStrings(
		this.test.parent.title,
	);
	const keys = {
		privateKey,
		publicKey,
	};

	if (typeof elements.cryptography.getKeys.returns === 'function') {
		elements.cryptography.getKeys.returns(keys);
	}
	if (
		typeof elements.cryptography.decryptPassphraseWithPassword.returns ===
		'function'
	) {
		elements.cryptography.decryptPassphraseWithPassword.returns(passphrase);
	}
	if (
		typeof elements.cryptography.getAddressFromPublicKey.returns === 'function'
	) {
		elements.cryptography.getAddressFromPublicKey.returns(address);
	}

	if (typeof cryptography.getKeys.returns === 'function') {
		cryptography.getKeys.returns(keys);
	}
	if (typeof cryptography.decryptPassphrase.returns === 'function') {
		cryptography.decryptPassphrase.returns({ passphrase });
	}
	if (typeof cryptography.getAddressFromPublicKey.returns === 'function') {
		cryptography.getAddressFromPublicKey.returns({ address });
	}

	this.test.ctx.passphrase = passphrase;
	this.test.ctx.keys = keys;
	this.test.ctx.address = address;
}

export function aPassword() {
	const password = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.password = password;
}

export function anEncryptedPassphrase() {
	const encryptedPassphrase = getFirstQuotedString(this.test.parent.title);
	const encryptedPassphraseObject = {
		iterations: 1,
		salt: 'e8c7dae4c893e458e0ebb8bff9a36d84',
		cipherText:
			'c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
		iv: '1a2206e426c714091b7e48f6',
		tag: '3a9d9f9f9a92c9a58296b8df64820c15',
		version: '1',
	};
	if (
		typeof elements.cryptography.parseEncryptedPassphrase.returns === 'function'
	) {
		elements.cryptography.parseEncryptedPassphrase.returns(
			encryptedPassphraseObject,
		);
	}
	if (
		typeof elements.cryptography.stringifyEncryptedPassphrase.returns ===
		'function'
	) {
		elements.cryptography.stringifyEncryptedPassphrase.returns(
			encryptedPassphrase,
		);
	}
	if (
		typeof elements.cryptography.encryptPassphraseWithPassword.returns ===
		'function'
	) {
		elements.cryptography.encryptPassphraseWithPassword.returns(
			encryptedPassphraseObject,
		);
	}

	this.test.ctx.encryptedPassphrase = encryptedPassphrase;
	this.test.ctx.encryptedPassphraseObject = encryptedPassphraseObject;
}

export function aMessage() {
	const message = getFirstQuotedString(this.test.parent.title);

	if (
		typeof elements.cryptography.decryptMessageWithPassphrase.returns ===
		'function'
	) {
		elements.cryptography.decryptMessageWithPassphrase.returns(message);
	}

	this.test.ctx.message = message;
}

export function aRecipient() {
	const recipient = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.recipient = recipient;
}

export function aRecipientPassphraseWithPrivateKeyAndPublicKey() {
	const [passphrase, privateKey, publicKey] = getQuotedStrings(
		this.test.parent.title,
	);
	this.test.ctx.recipientPassphrase = passphrase;
	this.test.ctx.recipientKeys = {
		privateKey,
		publicKey,
	};
}

export function anEncryptedMessageWithANonce() {
	const [cipher, nonce] = getQuotedStrings(this.test.parent.title);
	const cipherAndNonce = {
		cipher,
		nonce,
	};

	elements.cryptography.encryptMessageWithPassphrase.returns(cipherAndNonce);

	this.test.ctx.cipherAndNonce = cipherAndNonce;
}
