const cryptoModule = require('../utils/cryptoModule');

module.exports = function encryptCommand (vorpal) {
	'use strict';

	function encrypt ({ message, secret, recipient }) {
		return cryptoModule.encrypt(message, secret, recipient);
	}

	vorpal
		.command('encrypt <message> <secret> <recipient>')
		.description('Encrypt a message for a given recipient public key using your secret key. \n E.g. encrypt "Hello world" "my passphrase" bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0')
		.action(encrypt);
};
