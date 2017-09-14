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
import commonOptions from '../utils/options';
import { printResult } from '../utils/print';
import {
	getStdIn,
	getPassphrase,
	splitSource,
} from '../utils/input';

const ERROR_MESSAGE_MISSING = 'No message was provided.';
const ERROR_MESSAGE_SOURCE_TYPE_UNKNOWN = 'Unknown message source type. Must be one of `file`, or `stdin`.';
const ERROR_FILE_DOES_NOT_EXIST = 'File does not exist.';
const ERROR_FILE_UNREADABLE = 'File could not be read.';

const messageOptionDescription = `
Specifies a source for the message you would like to encrypt. If a message is provided directly as an argument, this option will be ignored.
The message must be provided via an argument or via this option. Sources must be one of \`file\` or \`stdin\`. In the case of \`file\`, a corresponding identifier must also be provided.

Note: if both secret passphrase and message are passed via stdin, the passphrase must be the first line.

Examples:
- \`--message file:/path/to/my/message.txt\`
- \`--message stdin\`
`.trim();

const getDataFromFile = async path => fse.readFileSync(path, 'utf8');

const getData = async (arg, source, { data }) => {
	if (arg) return arg;
	if (typeof data === 'string') return data;
	if (!source) {
		throw new Error(ERROR_MESSAGE_MISSING);
	}

	const { sourceType, sourceIdentifier } = splitSource(source);

	if (sourceType !== 'file') {
		throw new Error(ERROR_MESSAGE_SOURCE_TYPE_UNKNOWN);
	}

	return getDataFromFile(sourceIdentifier);
};

const handleMessageAndPassphrase = (vorpal, recipient) => ([passphrase, message]) => {
	const passphraseString = passphrase.toString();
	return cryptoModule.encrypt(message, passphraseString, recipient);
};

const handleError = (error) => {
	const { name, message } = error;
	let messageToPrint = message || name;

	if (message.match(/ENOENT/)) {
		messageToPrint = ERROR_FILE_DOES_NOT_EXIST;
	}
	if (message.match(/EACCES/)) {
		messageToPrint = ERROR_FILE_UNREADABLE;
	}

	return { error: `Could not encrypt: ${messageToPrint}` };
};

const encrypt = vorpal => ({ message, recipient, options }) => {
	const messageSource = options.message;
	const passphraseSource = options.passphrase;

	return getStdIn({
		passphraseIsRequired: passphraseSource === 'stdin',
		dataIsRequired: messageSource === 'stdin',
	})
		.then(stdIn => Promise.all([
			getPassphrase(vorpal, passphraseSource, stdIn),
			getData(message, messageSource, stdIn),
		]))
		.then(handleMessageAndPassphrase(vorpal, recipient))
		.catch(handleError)
		.then(printResult(vorpal, options));
};

function encryptCommand(vorpal) {
	vorpal
		.command('encrypt <recipient> [message]')
		.option('-m, --message <source>', messageOptionDescription)
		.option(...commonOptions.passphrase)
		.option(...commonOptions.json)
		.option(...commonOptions.noJson)
		.description('Encrypt a message for a given recipient public key using your secret passphrase. \n E.g. encrypt "Hello world" bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0')
		.action(encrypt(vorpal));
}

export default encryptCommand;
