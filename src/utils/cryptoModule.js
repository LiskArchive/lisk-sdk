'use strict';
const lisk = require('lisk-js');

class Crypto {
	encrypt (message, secret, recipient) {
		try {
			return lisk.crypto.encryptMessageWithSecret(message, secret, recipient);
		} catch ({ message }) {
			return { error: message };
		}
	}
}

module.exports = new Crypto();
