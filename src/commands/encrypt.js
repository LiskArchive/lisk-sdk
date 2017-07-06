module.exports = function encryptCommand (vorpal) {
	'use strict';

	vorpal
		.command('encrypt <message> <secret> <recipient>');
};
