/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
import inquirer from 'inquirer';
import readline from 'readline';
import { FileSystemError, ValidationError } from '../error';
import { stdinIsTTY, stdoutIsTTY } from '../helpers';

const capitalise = (text: string): string =>
	`${text.charAt(0).toUpperCase()}${text.slice(1)}`;

const getPassphraseVerificationFailError = (displayName: string): string =>
	`${capitalise(displayName)} was not successfully repeated.`;
const getPassphraseSourceTypeUnknownError = (displayName: string): string =>
	`${capitalise(
		displayName,
	)} was provided with an unknown source type. Must be one of \`env\`, \`file\`, or \`stdin\`. Leave blank for prompt.`;
const getPassphraseEnvVariableNotSetError = (displayName: string): string =>
	`Environmental variable for ${displayName} not set.`;
const getFileDoesNotExistError = (path: string): string =>
	`File at ${path} does not exist.`;
const getFileUnreadableError = (path: string): string =>
	`File at ${path} could not be read.`;
const ERROR_DATA_MISSING = 'No data was provided.';
const ERROR_DATA_SOURCE = 'Unknown data source type.';
const DEFAULT_TIMEOUT = 100;

interface SplitSource {
	readonly sourceIdentifier: string;
	readonly sourceType: string;
}

export const splitSource = (source: string): SplitSource => {
	const delimiter = ':';
	const sourceParts = source.split(delimiter);

	return {
		sourceType: sourceParts[0],
		sourceIdentifier: sourceParts.slice(1).join(delimiter),
	};
};

interface GetStdInInputs {
	readonly dataIsRequired?: boolean;
	readonly passphraseIsRequired?: boolean;
	readonly passwordIsRequired?: boolean;
	readonly secondPassphraseIsRequired?: boolean;
}

interface GetStdInOutput {
	readonly data?: string;
	readonly passphrase?: string;
	readonly password?: string;
	readonly secondPassphrase?: string;
}

export const getStdIn = async ({
	passphraseIsRequired,
	secondPassphraseIsRequired,
	passwordIsRequired,
	dataIsRequired,
}: GetStdInInputs = {}): Promise<GetStdInOutput> => {
	const readFromStd = new Promise<GetStdInOutput>((resolve, reject) => {
		if (
			!(
				passphraseIsRequired ||
				secondPassphraseIsRequired ||
				passwordIsRequired ||
				dataIsRequired
			)
		) {
			resolve({});

			return;
		}
		// tslint:disable readonly-array
		const lines: string[] = [];
		const rl = readline.createInterface({ input: process.stdin });

		// Prevent readline hanging when command called with no input or piped
		const id = setTimeout(() => {
			clearTimeout(id);
			reject(new Error(`Timed out after ${DEFAULT_TIMEOUT} ms`));
		}, DEFAULT_TIMEOUT);

		const handleClose = () => {
			const passphraseIndex = 0;
			const passphrase = passphraseIsRequired
				? lines[passphraseIndex]
				: undefined;

			const secondPassphraseIndex =
				passphraseIndex + (passphrase !== undefined ? 1 : 0);
			const secondPassphrase = secondPassphraseIsRequired
				? lines[secondPassphraseIndex]
				: undefined;

			const passwordIndex =
				secondPassphraseIndex + (secondPassphrase !== undefined ? 1 : 0);
			const password = passwordIsRequired ? lines[passwordIndex] : undefined;

			const dataStartIndex = passwordIndex + (password !== undefined ? 1 : 0);
			const dataLines = lines.slice(dataStartIndex);

			resolve({
				passphrase,
				secondPassphrase,
				password,
				data: dataLines.length ? dataLines.join('\n') : undefined,
			});

			return;
		};

		return rl.on('line', line => lines.push(line)).on('close', handleClose);
	});

	return readFromStd;
};

interface GetPassphraseFromPromptInputs {
	readonly displayName: string;
	readonly shouldRepeat?: boolean;
}

export const getPassphraseFromPrompt = async ({
	displayName,
	shouldRepeat,
}: GetPassphraseFromPromptInputs): Promise<string> => {
	const questions = [
		{
			type: 'password',
			name: 'passphrase',
			message: `Please enter ${displayName}: `,
		},
	];
	if (shouldRepeat) {
		questions.push({
			type: 'password',
			name: 'passphraseRepeat',
			message: `Please re-enter ${displayName}: `,
		});
	}

	// Prompting user for additional input when piping commands causes error with stdin
	if (!stdoutIsTTY() || !stdinIsTTY()) {
		throw new Error(
			`Please enter ${displayName} using a flag when piping data.`,
		);
	}

	const { passphrase, passphraseRepeat } = (await inquirer.prompt(
		questions,
	)) as { readonly passphrase?: string; readonly passphraseRepeat?: string };
	if (!passphrase || (shouldRepeat && passphrase !== passphraseRepeat)) {
		throw new ValidationError(getPassphraseVerificationFailError(displayName));
	}

	return passphrase;
};

export const getPassphraseFromEnvVariable = async (
	key: string,
	displayName: string,
) => {
	const passphrase = process.env[key];
	if (!passphrase) {
		throw new ValidationError(getPassphraseEnvVariableNotSetError(displayName));
	}

	return passphrase;
};

export const getPassphraseFromFile = async (path: string): Promise<string> =>
	new Promise<string>((resolve, reject) => {
		const stream = fs.createReadStream(path);
		const handleReadError = (error: Error) => {
			stream.close();
			const { message } = error;

			if (message.match(/ENOENT/)) {
				reject(new FileSystemError(getFileDoesNotExistError(path)));

				return;
			}
			if (message.match(/EACCES/)) {
				reject(new FileSystemError(getFileUnreadableError(path)));

				return;
			}

			reject(error);

			return;
		};
		const handleLine = (line: string) => {
			stream.close();
			resolve(line);
		};

		stream.on('error', handleReadError);

		readline
			.createInterface({ input: stream })
			.on('error', handleReadError)
			.on('line', handleLine);
	});

export const getPassphraseFromSource = async (
	source: string,
	{ displayName }: { readonly displayName: string },
): Promise<string> => {
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

export const getPassphrase = async (
	passphraseSource: string | undefined,
	options: object,
): Promise<string> => {
	const optionsWithDefaults = {
		displayName: 'your secret passphrase',
		...options,
	};

	return passphraseSource && passphraseSource !== 'prompt'
		? getPassphraseFromSource(passphraseSource, optionsWithDefaults)
		: getPassphraseFromPrompt(optionsWithDefaults);
};

export const handleReadFileErrors = (path: string) => (error: Error) => {
	const { message } = error;
	if (message.match(/ENOENT/)) {
		throw new FileSystemError(getFileDoesNotExistError(path));
	}
	if (message.match(/EACCES/)) {
		throw new FileSystemError(getFileUnreadableError(path));
	}
	throw error;
};

export const getDataFromFile = async (path: string) =>
	fs.readFileSync(path, 'utf8');

export const getData = async (source?: string) => {
	if (!source) {
		throw new ValidationError(ERROR_DATA_MISSING);
	}

	const { sourceType, sourceIdentifier: path } = splitSource(source);

	if (sourceType !== 'file') {
		throw new ValidationError(ERROR_DATA_SOURCE);
	}

	return getDataFromFile(path).catch(handleReadFileErrors(path));
};
