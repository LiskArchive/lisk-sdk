const cryptoModule = require('../utils/cryptoModule');

module.exports = function encryptCommand (vorpal) {
	'use strict';

	function encrypt ({ message, secret, recipient }) {
		return cryptoModule.encrypt(message, secret, recipient);
	}

	vorpal
		.command('encrypt <message> <secret> <recipient>')
		.action(encrypt);
};
