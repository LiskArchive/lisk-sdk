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

const wrapFunction = fn =>
	function wrappedFunction(...args) {
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
			'getKeys',
			'getAddressFromPublicKey',
		].forEach(methodName => {
			this[methodName] = wrapFunction(this[methodName].bind(this));
		});
	}

	encryptMessage({ message, passphrase, recipient }) {
		return this.liskCrypto.encryptMessageWithSecret(
			message,
			passphrase,
			recipient,
		);
	}

	decryptMessage({ cipher, nonce, passphrase, senderPublicKey }) {
		return {
			message: this.liskCrypto.decryptMessageWithSecret(
				cipher,
				nonce,
				passphrase,
				senderPublicKey,
			),
		};
	}

	encryptPassphrase({ passphrase, password }) {
		return this.liskCrypto.encryptPassphraseWithPassword(passphrase, password);
	}

	decryptPassphrase({ cipher, iv, password }) {
		return {
			passphrase: this.liskCrypto.decryptPassphraseWithPassword(
				{ cipher, iv },
				password,
			),
		};
	}

	getKeys(passphrase) {
		return this.liskCrypto.getKeys(passphrase);
	}

	getAddressFromPublicKey(publicKey) {
		return {
			address: this.liskCrypto.getAddressFromPublicKey(publicKey),
		};
	}
}

export default new Crypto();
