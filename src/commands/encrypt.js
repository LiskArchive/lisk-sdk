const cryptoModule = require('../utils/cryptoModule');

module.exports = function encryptCommand (vorpal) {
	'use strict';

	function encrypt (userInput) {
		return cryptoModule.encrypt();
	}

	vorpal
		.command('encrypt <message> <secret> <recipient>')
		.action(encrypt);
};
