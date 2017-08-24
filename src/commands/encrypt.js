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
import cryptoModule from '../utils/cryptoModule';
import tablify from '../utils/tablify';

const encrypt = vorpal => ({ message, secret, recipient, options }) => {
	const result = cryptoModule.encrypt(message, secret, recipient);
	const output = options.json
		? JSON.stringify(result)
		: tablify(result).toString();

	vorpal.log(output);
	return Promise.resolve(result);
};

function encryptCommand(vorpal) {
	vorpal
		.command('encrypt <message> <secret> <recipient>')
		.option('-j, --json', 'Sets output to json')
		.option('--no-json', 'Default: sets output to text. You can change this in the config.json')
		.description('Encrypt a message for a given recipient public key using your secret key. \n E.g. encrypt "Hello world" "my passphrase" bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0')
		.action(encrypt(vorpal));
}

export default encryptCommand;
