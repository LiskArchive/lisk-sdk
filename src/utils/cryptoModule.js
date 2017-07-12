const lisk = require('lisk-js');

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
}

module.exports = new Crypto();
