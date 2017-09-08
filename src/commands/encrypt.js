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
import readline from 'readline';
import fse from 'fs-extra';
import cryptoModule from '../utils/cryptoModule';
import tablify from '../utils/tablify';

const ERROR_PREFIX = 'Could not encrypt: ';
const createErrorMessage = str => `${ERROR_PREFIX}${str}`;
const ERROR_PASSPHRASE_FILE_DOES_NOT_EXIST = createErrorMessage('Passphrase file does not exist.');
const ERROR_PASSPHRASE_FILE_UNREADABLE = createErrorMessage('Passphrase file could not be read.');
const ERROR_PASSPHRASE_VERIFICATION_FAIL = createErrorMessage('Passphrase verification failed.');

const getPassphraseFromFile = async path => fse.readFileSync(path);

const getPassphraseFromStdIn = () => {
	const rl = readline.createInterface({
		input: process.stdin,
	});
	return new Promise((resolve) => {
		rl.on('line', (line) => {
			resolve(line);
		});
	});
};

const getPassphraseFromPrompt = (vorpal) => {
	// IMPORTANT: prompt will exit if UI has no parent, but calling
	// ui.attach(vorpal) will start a prompt, which will complain when we call
	// vorpal.activeCommand.prompt(). Therefore set the parent directly.
	if (!vorpal.ui.parent) {
		// eslint-disable-next-line no-param-reassign
		vorpal.ui.parent = vorpal;
	}
	const createPromptOptions = message => ({
		type: 'password',
		name: 'passphrase',
		message,
	});
	return vorpal.activeCommand.prompt(createPromptOptions('Please enter your secret passphrase: '))
		.then(({ passphrase }) => vorpal.activeCommand.prompt(createPromptOptions('Please re-enter your secret passphrase: '))
			.then(({ passphrase: passphraseRepeat }) => {
				if (passphrase !== passphraseRepeat) {
					throw new Error(ERROR_PASSPHRASE_VERIFICATION_FAIL);
				}
				return passphrase;
			}),
		);
};

const getPassphraseFromCommandLine = isTTY => (
	isTTY
		? getPassphraseFromPrompt
		: getPassphraseFromStdIn
);

const handlePassphrase = (vorpal, message, recipient, options) => (passphrase) => {
	const passphraseString = passphrase.toString().trim();

	const result = cryptoModule.encrypt(message, passphraseString, recipient);
	const output = options.json
		? JSON.stringify(result)
		: tablify(result).toString();

	vorpal.activeCommand.log(output);
	return result;
};

const handleError = vorpal => (error) => {
	const { name, message } = error;

	if (name.match(/ENOENT/)) {
		return vorpal.activeCommand.log(ERROR_PASSPHRASE_FILE_DOES_NOT_EXIST);
	}
	if (name.match(/EACCES/)) {
		return vorpal.activeCommand.log(ERROR_PASSPHRASE_FILE_UNREADABLE);
	}
	if (message.match(new RegExp(ERROR_PASSPHRASE_VERIFICATION_FAIL))) {
		return vorpal.activeCommand.log(message);
	}

	throw error;
};

const encrypt = vorpal => ({ message, recipient, options }) => {
	const passphraseFilePath = options['passphrase-file'];
	const getPassphrase = passphraseFilePath
		? getPassphraseFromFile.bind(null, passphraseFilePath)
		: getPassphraseFromCommandLine(process.stdin.isTTY).bind(null, vorpal);

	return getPassphrase()
		.then(handlePassphrase(vorpal, message, recipient, options))
		.catch(handleError(vorpal));
};

function encryptCommand(vorpal) {
	vorpal
		.command('encrypt <message> <recipient>')
		.option('-f, --passphrase-file <path>', 'Path to a file containing your secret passphrase.')
		.option('-j, --json', 'Sets output to json')
		.option('--no-json', 'Default: sets output to text. You can change this in the config.json')
		.description('Encrypt a message for a given recipient public key using your secret passphrase. \n E.g. encrypt "Hello world" bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0')
		.action(encrypt(vorpal));
}

export default encryptCommand;
