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
import fse from 'fs-extra';
import cryptoModule from '../utils/cryptoModule';
import tablify from '../utils/tablify';

const getSecretFromFile = path => new Promise((resolve, reject) =>
	fse.readFile(path, (error, data) => (
		error
			? reject(error)
			: resolve(data)
	)),
);

const getSecretFromPrompt = vorpal => vorpal.activeCommand.prompt({
	type: 'password',
	name: 'secret',
	message: 'Please enter your twelve-word pass phrase: ',
})
	.then(({ secret }) => secret);

const handleSecret = (vorpal, message, recipient, options) => (secret) => {
	const result = cryptoModule.encrypt(message, secret.trim(), recipient);
	const output = options.json
		? JSON.stringify(result)
		: tablify(result).toString();

	vorpal.activeCommand.log(output);
	return result;
};

const handleError = vorpal => (error) => {
	const message = error.message;
	if (message.match(/ENOENT/)) {
		return vorpal.activeCommand.log('Could not encrypt: passphrase file does not exist.');
	}
	if (message.match(/EACCES/)) {
		return vorpal.activeCommand.log('Could not encrypt: passphrase file could not be read.');
	}

	throw error;
};

const encrypt = vorpal => ({ message, recipient, options }) => {
	const passphraseFilePath = options['passphrase-file'];
	const getSecret = passphraseFilePath
		? getSecretFromFile.bind(null, passphraseFilePath)
		: getSecretFromPrompt.bind(null, vorpal);

	return getSecret()
		.then(handleSecret(vorpal, message, recipient, options))
		.catch(handleError(vorpal));
};

function encryptCommand(vorpal) {
	vorpal
		.command('encrypt <message> <recipient>')
		.option('--passphrase-file <path>', 'Path to a file containing your twelve-word secret pass phrase.')
		.option('-j, --json', 'Sets output to json')
		.option('--no-json', 'Default: sets output to text. You can change this in the config.json')
		.description('Encrypt a message for a given recipient public key using your secret key. \n E.g. encrypt "Hello world" "my passphrase" bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0')
		.action(encrypt(vorpal));
}

export default encryptCommand;
