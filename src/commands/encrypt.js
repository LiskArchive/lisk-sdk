const cryptoModule = require('../utils/cryptoModule');
const tablify = require('../utils/tablify');

module.exports = function encryptCommand (vorpal) {
	'use strict';

	function encrypt ({ message, secret, recipient, options }) {
		const result = cryptoModule.encrypt(message, secret, recipient);
		const output = options.json
			? JSON.stringify(result)
			: tablify(result).toString();
		vorpal.log(output);
		return Promise.resolve(result);
	}

	vorpal
		.command('encrypt <message> <secret> <recipient>')
		.option('-j, --json', 'Sets output to json')
		.description('Encrypt a message for a given recipient public key using your secret key. \n E.g. encrypt "Hello world" "my passphrase" bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0')
		.action(encrypt);
};
