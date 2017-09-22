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

const capitalise = text => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

const getPassphraseVerificationFailError = displayName => `${capitalise(displayName)} was not successfully repeated.`;
const getPassphraseSourceTypeUnknownError = displayName => `${capitalise(displayName)} was provided with an unknown source type. Must be one of \`env\`, \`file\`, or \`stdin\`. Leave blank for prompt.`;
const getPassphraseEnvVariableNotSetError = displayName => `Environmental variable for ${displayName} not set.`;
const getFileDoesNotExistError = path => `File at ${path} does not exist.`;
const getFileUnreadableError = path => `File at ${path} could not be read.`;
const ERROR_DATA_MISSING = 'No data was provided.';
const ERROR_DATA_SOURCE_TYPE_UNKNOWN = 'Unknown data source type. Must be one of `file`, or `stdin`.';

export const splitSource = (source) => {
	const delimiter = ':';
	const sourceParts = source.split(delimiter);
	return {
		sourceType: sourceParts[0],
		sourceIdentifier: sourceParts.slice(1).join(delimiter),
	};
};

export const getStdIn = ({ dataIsRequired, passphraseIsRequired } = {}) =>
	new Promise((resolve) => {
		if (!dataIsRequired && !passphraseIsRequired) return resolve({});

		const lines = [];
		const rl = readline.createInterface({ input: process.stdin });

		const handleLine = line => (
			dataIsRequired
				? lines.push(line)
				: resolve({ passphrase: line }) || rl.close()
		);
		const handleClose = () => {
			const dataLines = passphraseIsRequired ? lines.slice(1) : lines;
			return resolve({
				data: dataLines.join('\n'),
				passphrase: passphraseIsRequired ? lines[0] : null,
			});
		};

		return rl
			.on('line', handleLine)
			.on('close', handleClose);
	});

export const createPromptOptions = message => ({
	type: 'password',
	name: 'passphrase',
	message,
});

export const getPassphraseFromPrompt = (vorpal, { displayName, shouldRepeat }) => {
	// IMPORTANT: prompt will exit if UI has no parent, but calling
	// ui.attach(vorpal) will start a prompt, which will complain when we call
	// vorpal.activeCommand.prompt(). Therefore set the parent directly.
	if (!vorpal.ui.parent) {
		// eslint-disable-next-line no-param-reassign
		vorpal.ui.parent = vorpal;
	}

	const handleSecondPassphrase = passphrase => vorpal.activeCommand.prompt(createPromptOptions(`Please re-enter ${displayName}: `))
		.then(({ passphrase: passphraseRepeat }) => {
			if (passphrase !== passphraseRepeat) {
				throw new Error(getPassphraseVerificationFailError(displayName));
			}
			return passphrase;
		});

	const handleFirstPassphrase = ({ passphrase }) => (
		shouldRepeat
			? handleSecondPassphrase(passphrase)
			: passphrase
	);

	return vorpal.activeCommand.prompt(createPromptOptions(`Please enter ${displayName}: `))
		.then(handleFirstPassphrase);
};

export const getPassphraseFromEnvVariable = async (key, displayName) => {
	const passphrase = process.env[key];
	if (!passphrase) {
		throw new Error(getPassphraseEnvVariableNotSetError(displayName));
	}
	return passphrase;
};


export const getPassphraseFromFile = path => new Promise((resolve, reject) => {
	const stream = fse.createReadStream(path);
	const handleReadError = (error) => {
		stream.close();
		const { message } = error;

		if (message.match(/ENOENT/)) {
			return reject(new Error(getFileDoesNotExistError(path)));
		}
		if (message.match(/EACCES/)) {
			return reject(new Error(getFileUnreadableError(path)));
		}

		return reject(error);
	};
	const handleLine = (line) => {
		stream.close();
		resolve(line);
	};

	stream.on('error', handleReadError);

	readline.createInterface({ input: stream })
		.on('error', handleReadError)
		.on('line', handleLine);
});

export const getPassphraseFromSource = async (source, { displayName }) => {
	const { sourceType, sourceIdentifier } = splitSource(source);

	switch (sourceType) {
	case 'env':
		return getPassphraseFromEnvVariable(sourceIdentifier, displayName);
	case 'file':
		return getPassphraseFromFile(sourceIdentifier);
	case 'pass':
		return sourceIdentifier;
	default:
		throw new Error(getPassphraseSourceTypeUnknownError(displayName));
	}
};

export const getPassphrase = async (vorpal, passphraseSource, passphrase, options) => {
	const optionsWithDefaults = Object.assign({ displayName: 'your secret passphrase' }, options);
	if (passphrase) return passphrase;
	if (!passphraseSource) return getPassphraseFromPrompt(vorpal, optionsWithDefaults);
	return getPassphraseFromSource(passphraseSource, optionsWithDefaults);
};

export const getFirstLineFromString = multilineString => (
	typeof multilineString === 'string'
		? multilineString.split(/[\r\n]+/)[0]
		: null
);

export const getDataFromFile = async path => fse.readFileSync(path, 'utf8');

export const getData = async (arg, source, data) => {
	if (arg) return arg;
	if (typeof data === 'string') return data;
	if (!source) {
		throw new Error(ERROR_DATA_MISSING);
	}

	const { sourceType, sourceIdentifier: path } = splitSource(source);

	if (sourceType !== 'file') {
		throw new Error(ERROR_DATA_SOURCE_TYPE_UNKNOWN);
	}

	return getDataFromFile(path)
		.catch((error) => {
			const { message } = error;
			if (message.match(/ENOENT/)) {
				throw new Error(getFileDoesNotExistError(path));
			}
			if (message.match(/EACCES/)) {
				throw new Error(getFileUnreadableError(path));
			}
			throw error;
		});
};
