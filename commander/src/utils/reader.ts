/*
 * LiskHQ/lisk-commander
 * Copyright © 2020 Lisk Foundation
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
import { Schema } from '@liskhq/lisk-codec';

import * as path from 'path';
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import * as readline from 'readline';

import { FileSystemError, ValidationError } from './error';

interface NestedAsset {
	[key: string]: Array<Record<string, unknown>>;
}

interface SplitSource {
	readonly sourceIdentifier: string;
	readonly sourceType: string;
}

const capitalise = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

const getPromptVerificationFailError = (displayName: string): string =>
	`${capitalise(displayName)} was not successfully repeated.`;

const splitSource = (source: string): SplitSource => {
	const delimiter = ':';
	const sourceParts = source.split(delimiter);

	return {
		sourceType: sourceParts[0],
		sourceIdentifier: sourceParts.slice(1).join(delimiter),
	};
};

export const getPassphraseFromPrompt = async (
	displayName = 'passphrase',
	shouldConfirm = false,
): Promise<string> => {
	const questions = [
		{
			type: 'password',
			name: 'passphrase',
			message: `Please enter ${displayName}: `,
		},
	];
	if (shouldConfirm) {
		questions.push({
			type: 'password',
			name: 'passphraseRepeat',
			message: `Please re-enter ${displayName}: `,
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const { passphrase, passphraseRepeat } = await inquirer.prompt(questions);

	if (!passphrase || (shouldConfirm && passphrase !== passphraseRepeat)) {
		throw new ValidationError(getPromptVerificationFailError(displayName));
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return passphrase;
};

export const getPasswordFromPrompt = async (
	displayName = 'password',
	shouldConfirm = false,
): Promise<string> => {
	const questions = [
		{
			type: 'password',
			name: 'password',
			message: `Please enter ${displayName}: `,
		},
	];
	if (shouldConfirm) {
		questions.push({
			type: 'password',
			name: 'passwordRepeat',
			message: `Please re-enter ${displayName}: `,
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const { password, passwordRepeat } = await inquirer.prompt(questions);
	if (!password || (shouldConfirm && password !== passwordRepeat)) {
		throw new ValidationError(getPromptVerificationFailError(displayName));
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return password;
};

const getFileDoesNotExistError = (filePath: string): string =>
	`File at ${filePath} does not exist.`;
const getFileUnreadableError = (filePath: string): string =>
	`File at ${filePath} could not be read.`;

const getDataFromFile = (filePath: string) => fs.readFileSync(filePath, 'utf8');

const ERROR_DATA_MISSING = 'No data was provided.';
const ERROR_DATA_SOURCE = 'Unknown data source type.';
const INVALID_JSON_FILE = 'Not a JSON file.';
const FILE_NOT_FOUND = 'No such file or directory.';

export const isFileSource = (source?: string): boolean => {
	if (!source) {
		return false;
	}
	const delimiter = ':';
	const sourceParts = source.split(delimiter);
	if (sourceParts.length === 2 && sourceParts[0] === 'file') {
		return true;
	}

	return false;
};

export const readFileSource = async (source?: string): Promise<string> => {
	if (!source) {
		throw new ValidationError(ERROR_DATA_MISSING);
	}

	const { sourceType, sourceIdentifier: filePath } = splitSource(source);

	if (sourceType !== 'file') {
		throw new ValidationError(ERROR_DATA_SOURCE);
	}
	try {
		return getDataFromFile(filePath);
	} catch (error) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const { message } = error as Error;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access, @typescript-eslint/prefer-regexp-exec
		if (message.match(/ENOENT/)) {
			throw new FileSystemError(getFileDoesNotExistError(filePath));
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access, @typescript-eslint/prefer-regexp-exec
		if (message.match(/EACCES/)) {
			throw new FileSystemError(getFileUnreadableError(filePath));
		}
		throw error;
	}
};

const DEFAULT_TIMEOUT = 100;

export const readStdIn = async (): Promise<string[]> => {
	const readFromStd = new Promise<string[]>((resolve, reject) => {
		const lines: string[] = [];
		const rl = readline.createInterface({ input: process.stdin });

		// Prevent readline hanging when command called with no input or piped
		setTimeout(() => {
			reject(new Error(`Timed out after ${DEFAULT_TIMEOUT} ms`));
		}, DEFAULT_TIMEOUT);

		const handleClose = () => {
			resolve(lines);
		};

		return rl.on('line', line => lines.push(line)).on('close', handleClose);
	});

	return readFromStd;
};

const castValue = (val: string, schemaType: string): string | number | bigint => {
	if (schemaType === 'uint64' || schemaType === 'sint64') {
		return BigInt(val);
	}
	if (schemaType === 'uint32' || schemaType === 'sint32') {
		return Number(val);
	}
	return val;
};

const castArray = (items: string[], schemaType: string): string[] | number[] | bigint[] => {
	if (schemaType === 'uint64' || schemaType === 'sint64') {
		return items.map(i => BigInt(i));
	}

	if (schemaType === 'uint32' || schemaType === 'sint32') {
		return items.map(i => Number(i));
	}

	return items;
};

const getNestedParametersFromPrompt = async (property: {
	name: string;
	items: { properties: Record<string, unknown> };
}) => {
	let addMore = false;
	const nestedArray: Array<Record<string, unknown>> = [];

	do {
		const nestedProperties = Object.keys(property.items.properties);
		const nestedPropertiesCsv = nestedProperties.join(',');

		const nestedPropertiesAnswer: Record<string, string> = await inquirer.prompt({
			type: 'input',
			name: property.name,
			message: `Please enter: ${property.name}(${nestedPropertiesCsv}): `,
		});

		const properties = nestedPropertiesAnswer[property.name].split(',');

		const nestedObject: Record<string, unknown> = {};

		for (let i = 0; i < nestedProperties.length; i += 1) {
			const propertySchema = property.items.properties[nestedProperties[i]] as { dataType: string };
			nestedObject[nestedProperties[i]] =
				properties[i] === undefined ? '' : castValue(properties[i], propertySchema.dataType);
		}

		nestedArray.push(nestedObject);

		const confirmResponse = await inquirer.prompt({
			type: 'confirm',
			name: 'askAgain',
			message: `Want to enter another ${property.name})`,
		});

		addMore = confirmResponse.askAgain as boolean;
	} while (addMore);

	const result = {} as Record<string, unknown>;
	result[property.name] = nestedArray;

	return result;
};

export const getParamsFromPrompt = async (
	assetSchema: Schema | { properties: Record<string, unknown> },
): Promise<NestedAsset | Record<string, unknown>> => {
	const result: Record<string, unknown> = {};
	for (const propertyName of Object.keys(assetSchema.properties)) {
		const property = assetSchema.properties[propertyName] as {
			dataType?: string;
			type?: 'array';
			items?: { dataType?: string; type?: 'object'; properties?: Record<string, unknown> };
		};

		if (
			property.type === 'array' &&
			property.items?.type === 'object' &&
			property.items.properties !== undefined
		) {
			const nestedResult = await getNestedParametersFromPrompt({
				name: propertyName,
				items: {
					properties: property.items.properties,
				},
			});

			result[propertyName] = nestedResult[propertyName];

			continue;
		}

		if (
			property.type === 'array' &&
			property.items?.type === undefined &&
			property.items?.dataType !== undefined
		) {
			const answer: Record<string, string> = await inquirer.prompt({
				type: 'input',
				name: propertyName,
				message: `Please enter: ${propertyName}(comma separated values (a,b)): `,
			});

			result[propertyName] = castArray(
				answer[propertyName] === '' ? [] : answer[propertyName].split(','),
				property.items.dataType,
			);
		} else {
			const answer: Record<string, string> = await inquirer.prompt({
				type: 'input',
				name: propertyName,
				message: `Please enter: ${propertyName}: `,
			});

			result[propertyName] = castValue(
				answer[propertyName],
				(property as { dataType: string }).dataType,
			);
		}
	}

	return result;
};

export const checkFileExtension = (filePath: string): void => {
	const ext = path.extname(filePath);

	if (!ext || ext !== '.json') {
		throw new ValidationError(INVALID_JSON_FILE);
	}
};

export const readParamsFile = (filePath: string): string => {
	try {
		const params = fs.readFileSync(filePath, 'utf8');
		return params;
	} catch (err) {
		throw new ValidationError(FILE_NOT_FOUND);
	}
};

export const getFileParams = (filePath: string): string => {
	checkFileExtension(filePath);
	return readParamsFile(filePath);
};
