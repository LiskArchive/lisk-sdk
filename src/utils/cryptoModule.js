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
import { crypto as liskCrypto } from 'lisk-js';

const wrapFunction = fn => function wrappedFunction(...args) {
	try {
		return fn(...args);
	} catch ({ message: error }) {
		return { error };
	}
};

class Crypto {
	constructor() {
		this.liskCrypto = liskCrypto;

		[
			'encryptMessage',
			'decryptMessage',
			'encryptPassphrase',
			'decryptPassphrase',
		].forEach((methodName) => {
			this[methodName] = wrapFunction(this[methodName].bind(this));
		});
	}

	encryptMessage(message, secret, recipient) {
		return this.liskCrypto.encryptMessageWithSecret(message, secret, recipient);
	}

	decryptMessage(encryptedMessage, nonce, secret, senderPublicKey) {
		return {
			message: this.liskCrypto
				.decryptMessageWithSecret(encryptedMessage, nonce, secret, senderPublicKey),
		};
	}

	encryptPassphrase(passphrase, password) {
		return this.liskCrypto.encryptPassphraseWithPassword(passphrase, password);
	}

	decryptPassphrase(cipherAndIv, password) {
		return {
			passphrase: this.liskCrypto.decryptPassphraseWithPassword(cipherAndIv, password),
		};
	}
}

export default new Crypto();
