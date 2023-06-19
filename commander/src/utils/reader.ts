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

interface PropertyValue {
	readonly dataType: string;
	readonly type: string;
	readonly items: { type: string; properties: Record<string, unknown> };
}

interface Question {
	readonly [key: string]: unknown;
}

interface NestedPropertyTemplate {
	[key: string]: string[];
}

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

const getNestedPropertyTemplate = (schema: Schema): NestedPropertyTemplate => {
	const keyValEntries = Object.entries(schema.properties);
	const template: NestedPropertyTemplate = {};

	// eslint-disable-next-line @typescript-eslint/prefer-for-of
	for (let i = 0; i < keyValEntries.length; i += 1) {
		const [schemaPropertyName, schemaPropertyValue] = keyValEntries[i];
		if ((schemaPropertyValue as PropertyValue).type === 'array') {
			// nested items properties
			if ((schemaPropertyValue as PropertyValue).items.type === 'object') {
				template[schemaPropertyName] = Object.keys(
					(schemaPropertyValue as PropertyValue).items.properties,
				);
			}
		}
	}
	return template;
};

const castValue = (
	val: string,
	schemaType: string,
): number | bigint | string | string[] | Record<string, unknown> => {
	if (schemaType === 'object') {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return JSON.parse(val);
	}
	if (schemaType === 'array') {
		if (val === '') return [];
		return val.split(',');
	}
	if (schemaType === 'uint64' || schemaType === 'sint64') {
		return BigInt(val);
	}
	if (schemaType === 'uint32' || schemaType === 'sint32') {
		return Number(val);
	}
	return val;
};

export const transformAsset = (
	schema: Schema,
	data: Record<string, string>,
): Record<string, unknown> => {
	const propertySchema = Object.values(schema.properties);
	const assetData = {} as Record<string, unknown>;
	return Object.entries(data).reduce((acc, curr, index) => {
		const propSchema = propertySchema[index] as { type: string; dataType: string };
		// Property schema type can be scalar(string, bool, etc..) or structural(object, array)
		const schemaType = propSchema.type || propSchema.dataType;
		acc[curr[0]] = castValue(curr[1], schemaType);
		return acc;
	}, assetData);
};

export const transformNestedAsset = (
	schema: Schema,
	data: Array<Record<string, string>>,
): NestedAsset => {
	const template = getNestedPropertyTemplate(schema);
	const result = {} as NestedAsset;
	const items: Array<Record<string, unknown>> = [];
	for (const assetData of data) {
		const [[key, val]] = Object.entries(assetData);
		const templateValues = template[key];
		const initData = {} as Record<string, unknown>;
		const valObject = val.split(',').reduce((acc, curr, index) => {
			acc[templateValues[index]] = Number.isInteger(Number(curr)) ? Number(curr) : curr;
			return acc;
		}, initData);
		items.push(valObject);
		result[key] = items;
	}
	return result;
};

export const prepareQuestions = (schema: Schema): Question[] => {
	const keyValEntries = Object.entries(schema.properties);
	const questions: Question[] = [];

	for (const [schemaPropertyName, schemaPropertyValue] of keyValEntries) {
		if ((schemaPropertyValue as PropertyValue).type === 'array') {
			let commaSeparatedKeys: string[] = [];
			// nested items properties
			if ((schemaPropertyValue as PropertyValue).items.type === 'object') {
				commaSeparatedKeys = Object.keys((schemaPropertyValue as PropertyValue).items.properties);
			}
			questions.push({
				type: 'input',
				name: schemaPropertyName,
				message: `Please enter: ${schemaPropertyName}(${
					commaSeparatedKeys.length ? commaSeparatedKeys.join(', ') : 'comma separated values (a,b)'
				}): `,
			});
			if ((schemaPropertyValue as PropertyValue).items.type === 'object') {
				questions.push({
					type: 'confirm',
					name: 'askAgain',
					message: `Want to enter another ${schemaPropertyName}(${commaSeparatedKeys.join(', ')})`,
				});
			}
		} else {
			questions.push({
				type: 'input',
				name: schemaPropertyName,
				message: `Please enter: ${schemaPropertyName}: `,
			});
		}
	}
	return questions;
};

export const getParamsFromPrompt = async (
	assetSchema: Schema,
	output: Array<{ [key: string]: string }> = [],
): Promise<NestedAsset | Record<string, unknown>> => {
	// prepare array of questions based on asset schema
	const questions = prepareQuestions(assetSchema);
	if (questions.length === 0) {
		return {};
	}
	let isTypeConfirm = false;
	// Prompt user with prepared questions
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const result = await inquirer.prompt(questions).then(async answer => {
		const inquirerResult = answer as { [key: string]: string };
		isTypeConfirm = typeof inquirerResult.askAgain === 'boolean';
		// if its a multiple questions prompt user again
		if (inquirerResult.askAgain) {
			output.push(inquirerResult);
			return getParamsFromPrompt(assetSchema, output);
		}
		output.push(inquirerResult);
		return Promise.resolve(answer);
	});
	const filteredResult = output.map(({ askAgain, ...assetProps }) => assetProps);

	// transform asset prompt result according to asset schema
	return isTypeConfirm
		? transformNestedAsset(assetSchema, filteredResult)
		: transformAsset(assetSchema, result as Record<string, string>);
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
