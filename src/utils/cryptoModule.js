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

class Crypto {
	constructor() {
		this.lisk = lisk;
	}

	encrypt(message, secret, recipient) {
		try {
			return this.lisk.crypto.encryptMessageWithSecret(message, secret, recipient);
		} catch ({ message: error }) {
			return { error };
		}
	}

	decrypt(encryptedMessage, nonce, secret, senderPublicKey) {
		try {
			const message = this.lisk.crypto
				.decryptMessageWithSecret(encryptedMessage, nonce, secret, senderPublicKey);
			return { message };
		} catch ({ message: error }) {
			return { error };
		}
	}

	encryptPassphrase(passphrase, password) {
		try {
			return this.lisk.crypto.encryptPassphraseWithPassword(passphrase, password);
		} catch ({ message: error }) {
			return { error };
		}
	}

	decryptPassphrase(cipherAndIv, password) {
		try {
			const passphrase = this.lisk.crypto.decryptPassphraseWithPassword(cipherAndIv, password);
			return { passphrase };
		} catch ({ message: error }) {
			return { error };
		}
	}
}

module.exports = new Crypto();
