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

const ERROR_PASSPHRASE_ENV_VARIABLE_NOT_SET = createErrorMessage('Passphrase environmental variable not set.');
const ERROR_PASSPHRASE_FILE_DOES_NOT_EXIST = createErrorMessage('Passphrase file does not exist.');
const ERROR_PASSPHRASE_FILE_UNREADABLE = createErrorMessage('Passphrase file could not be read.');
const ERROR_PASSPHRASE_FILE_DESCRIPTOR_NOT_AN_INTEGER = createErrorMessage('Passphrase file descriptor is not an integer.');
const ERROR_PASSPHRASE_FILE_DESCRIPTOR_BAD = createErrorMessage('Passphrase file descriptor is bad.');
const ERROR_PASSPHRASE_VERIFICATION_FAIL = createErrorMessage('Passphrase verification failed.');

const passPhraseOptionDescription = `
Specifies a source for your secret passphrase. Lisky will prompt you for input if this option is not set.
Source must be one of \`env\`, \`fd\`, \`file\` or \`stdin\`. Except for \`stdin\`, a corresponding identifier must also be provided.
Examples:
- \`--passphrase env:SECRET_PASSPHRASE\`
- \`--passphrase fd:115\`
- \`--passphrase file:~/path/to/my/passphrase.txt\`
- \`--passphrase stdin\`
`.trim();

const getPassphraseFromEnvVariable = (key) => {
	const passphrase = process.env[key];
	if (!passphrase) {
		throw new Error(ERROR_PASSPHRASE_ENV_VARIABLE_NOT_SET);
	}
	return passphrase;
};

const getPassphraseFromFile = (path, options) => new Promise((resolve, reject) => {
	const stream = fse.createReadStream(path, options);
	const handleStreamError = (error) => {
		stream.close();
		reject(error);
	};
	stream.on('error', handleStreamError);

	readline.createInterface({ input: stream })
		.on('error', handleStreamError)
		.on('line', (line) => {
			stream.close();
			resolve(line);
		});
});

const getPassphraseFromFD = async (fdString) => {
	const fd = parseInt(fdString, 10);
	if (fd.toString() !== fdString) {
		throw new Error(ERROR_PASSPHRASE_FILE_DESCRIPTOR_NOT_AN_INTEGER);
	}
	return getPassphraseFromFile(null, { fd });
};

const getPassphraseFromStdIn = () => new Promise((resolve) => {
	readline.createInterface({ input: process.stdin })
		.on('line', (line) => {
			resolve(line);
		});
});

const getPassphraseFromSource = async (source) => {
	const delimiter = ':';
	const splitSource = source.split(delimiter);
	const sourceType = splitSource[0];
	if (sourceType === 'stdin') return getPassphraseFromStdIn();

	const sourceIdentifier = splitSource.slice(1).join(delimiter);

	switch (sourceType) {
	case 'file':
		return getPassphraseFromFile(sourceIdentifier);
	case 'env':
		return getPassphraseFromEnvVariable(sourceIdentifier);
	case 'fd':
		return getPassphraseFromFD(sourceIdentifier);
	default:
		throw new Error('Unknown passphrase source type: Must be one of `env`, `fd`, `file`, or `stdin`. Leave blank for prompt.');
	}
};

const createPromptOptions = message => ({
	type: 'password',
	name: 'passphrase',
	message,
});

const getPassphraseFromPrompt = (vorpal) => {
	// IMPORTANT: prompt will exit if UI has no parent, but calling
	// ui.attach(vorpal) will start a prompt, which will complain when we call
	// vorpal.activeCommand.prompt(). Therefore set the parent directly.
	if (!vorpal.ui.parent) {
		// eslint-disable-next-line no-param-reassign
		vorpal.ui.parent = vorpal;
	}
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

const handlePassphrase = (vorpal, message, recipient) => (passphrase) => {
	const passphraseString = passphrase.toString().trim();
	return cryptoModule.encrypt(message, passphraseString, recipient);
};

const handleError = (error) => {
	const { name, message } = error;

	if (message.match(/ENOENT/)) {
		return { error: ERROR_PASSPHRASE_FILE_DOES_NOT_EXIST };
	}
	if (message.match(/EACCES/)) {
		return { error: ERROR_PASSPHRASE_FILE_UNREADABLE };
	}
	if (message.match(/EBADF/)) {
		return { error: ERROR_PASSPHRASE_FILE_DESCRIPTOR_BAD };
	}

	return { error: message || name };
};

const printResult = (vorpal, options) => (result) => {
	const output = options.json
		? JSON.stringify(result)
		: tablify(result).toString();

	vorpal.activeCommand.log(output);
	return result;
};

const encrypt = vorpal => ({ message, recipient, options }) => {
	const passphraseSource = options.passphrase;
	const getPassphrase = passphraseSource
		? getPassphraseFromSource.bind(null, passphraseSource)
		: getPassphraseFromPrompt.bind(null, vorpal);

	return getPassphrase()
		.then(handlePassphrase(vorpal, message, recipient))
		.catch(handleError)
		.then(printResult(vorpal, options));
};

function encryptCommand(vorpal) {
	vorpal
		.command('encrypt <message> <recipient>')
		.option('-p, --passphrase <source>', passPhraseOptionDescription)
		.option('-j, --json', 'Sets output to json')
		.option('--no-json', 'Default: sets output to text. You can change this in the config.json')
		.description('Encrypt a message for a given recipient public key using your secret passphrase. \n E.g. encrypt "Hello world" bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0')
		.action(encrypt(vorpal));
}

export default encryptCommand;
