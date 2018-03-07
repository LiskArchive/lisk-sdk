/*
 * LiskHQ/lisk-commander
 * Copyright © 2016–2018 Lisk Foundation
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
import fs from 'fs';
import readline from 'readline';
import { FileSystemError, ValidationError } from '../error';

const capitalise = text => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

const getPassphraseVerificationFailError = displayName =>
	`${capitalise(displayName)} was not successfully repeated.`;
const getPassphraseSourceTypeUnknownError = displayName =>
	`${capitalise(
		displayName,
	)} was provided with an unknown source type. Must be one of \`env\`, \`file\`, or \`stdin\`. Leave blank for prompt.`;
const getPassphraseEnvVariableNotSetError = displayName =>
	`Environmental variable for ${displayName} not set.`;
const getFileDoesNotExistError = path => `File at ${path} does not exist.`;
const getFileUnreadableError = path => `File at ${path} could not be read.`;
const ERROR_DATA_MISSING = 'No data was provided.';
const ERROR_DATA_SOURCE = 'Unknown data source type.';
const DEFAULT_TIMEOUT = 100;

export const splitSource = source => {
	const delimiter = ':';
	const sourceParts = source.split(delimiter);
	return {
		sourceType: sourceParts[0],
		sourceIdentifier: sourceParts.slice(1).join(delimiter),
	};
};

const timeoutPromise = ms =>
	new Promise((resolve, reject) => {
		const id = setTimeout(() => {
			clearTimeout(id);
			reject(new Error(`Timed out after ${ms} ms`));
		}, ms);
	});

export const getStdIn = ({
	passphraseIsRequired,
	secondPassphraseIsRequired,
	passwordIsRequired,
	dataIsRequired,
} = {}) => {
	const readFromStd = new Promise(resolve => {
		if (
			!(
				passphraseIsRequired ||
				secondPassphraseIsRequired ||
				passwordIsRequired ||
				dataIsRequired
			)
		) {
			return resolve({});
		}

		const lines = [];
		const rl = readline.createInterface({ input: process.stdin });

		const handleClose = () => {
			const passphraseIndex = 0;
			const passphrase = passphraseIsRequired ? lines[passphraseIndex] : null;

			const secondPassphraseIndex = passphraseIndex + (passphrase !== null);
			const secondPassphrase = secondPassphraseIsRequired
				? lines[secondPassphraseIndex]
				: null;

			const passwordIndex = secondPassphraseIndex + (secondPassphrase !== null);
			const password = passwordIsRequired ? lines[passwordIndex] : null;

			const dataStartIndex = passwordIndex + (password !== null);
			const dataLines = lines.slice(dataStartIndex);

			return resolve({
				passphrase,
				secondPassphrase,
				password,
				data: dataLines.length ? dataLines.join('\n') : null,
			});
		};

		return rl.on('line', line => lines.push(line)).on('close', handleClose);
	});
	return Promise.race([readFromStd, timeoutPromise(DEFAULT_TIMEOUT)]);
};

export const createPromptOptions = message => ({
	type: 'password',
	name: 'passphrase',
	message,
});

export const getPassphraseFromPrompt = (
	vorpal,
	{ displayName, shouldRepeat },
) => {
	// IMPORTANT: prompt will exit if UI has no parent, but calling
	// ui.attach(vorpal) will start a prompt, which will complain when we call
	// vorpal.activeCommand.prompt(). Therefore set the parent directly.
	if (!vorpal.ui.parent) {
		// eslint-disable-next-line no-param-reassign
		vorpal.ui.parent = vorpal;
	}

	const handlePassphraseRepeat = passphrase =>
		vorpal.activeCommand
			.prompt(createPromptOptions(`Please re-enter ${displayName}: `))
			.then(({ passphrase: passphraseRepeat }) => {
				if (passphrase !== passphraseRepeat) {
					throw new ValidationError(
						getPassphraseVerificationFailError(displayName),
					);
				}
				return passphrase;
			});

	const handlePassphrase = ({ passphrase }) =>
		shouldRepeat ? handlePassphraseRepeat(passphrase) : passphrase;

	return vorpal.activeCommand
		.prompt(createPromptOptions(`Please enter ${displayName}: `))
		.then(handlePassphrase);
};

export const getPassphraseFromEnvVariable = async (key, displayName) => {
	const passphrase = process.env[key];
	if (!passphrase) {
		throw new ValidationError(getPassphraseEnvVariableNotSetError(displayName));
	}
	return passphrase;
};

export const getPassphraseFromFile = path =>
	new Promise((resolve, reject) => {
		const stream = fs.createReadStream(path);
		const handleReadError = error => {
			stream.close();
			const { message } = error;

			if (message.match(/ENOENT/)) {
				return reject(new FileSystemError(getFileDoesNotExistError(path)));
			}
			if (message.match(/EACCES/)) {
				return reject(new FileSystemError(getFileUnreadableError(path)));
			}

			return reject(error);
		};
		const handleLine = line => {
			stream.close();
			resolve(line);
		};

		stream.on('error', handleReadError);

		readline
			.createInterface({ input: stream })
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
			throw new ValidationError(
				getPassphraseSourceTypeUnknownError(displayName),
			);
	}
};

export const getPassphrase = async (vorpal, passphraseSource, options) => {
	const optionsWithDefaults = Object.assign(
		{ displayName: 'your secret passphrase' },
		options,
	);
	return passphraseSource && passphraseSource !== 'prompt'
		? getPassphraseFromSource(passphraseSource, optionsWithDefaults)
		: getPassphraseFromPrompt(vorpal, optionsWithDefaults);
};

export const handleReadFileErrors = path => error => {
	const { message } = error;
	if (message.match(/ENOENT/)) {
		throw new FileSystemError(getFileDoesNotExistError(path));
	}
	if (message.match(/EACCES/)) {
		throw new FileSystemError(getFileUnreadableError(path));
	}
	throw error;
};

export const getDataFromFile = async path => fs.readFileSync(path, 'utf8');

export const getData = async source => {
	if (!source) {
		throw new ValidationError(ERROR_DATA_MISSING);
	}

	const { sourceType, sourceIdentifier: path } = splitSource(source);

	if (sourceType !== 'file') {
		throw new ValidationError(ERROR_DATA_SOURCE);
	}

	return getDataFromFile(path).catch(handleReadFileErrors(path));
};
