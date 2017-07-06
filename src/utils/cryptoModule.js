'use strict';
const lisk = require('lisk-js');

class Crypto {
	encrypt (message, secret, recipient) {
		return lisk.crypto.encryptMessageWithSecret(message, secret, recipient);
	}
}

module.exports = new Crypto();
