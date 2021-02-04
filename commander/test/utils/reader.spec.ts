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
import fs from 'fs';
import readline from 'readline';
import inquirer from 'inquirer';
import { createFakeInterface } from '../helpers/utils';
import {
	readStdIn,
	getPassphraseFromPrompt,
	isFileSource,
	readFileSource,
} from '../../src/utils/reader';

describe('reader', () => {
	describe('readPassphraseFromPrompt', () => {
		const displayName = 'password';
		const defaultInputs =
			'tiny decrease photo key change abuse forward penalty twin foot wish expose';
		let promptStub: jest.SpyInstance;

		beforeEach(() => {
			promptStub = jest.spyOn(inquirer, 'prompt');
		});

		it('passphrase should equal to the result of the prompt', async () => {
			const promptResult = { passphrase: defaultInputs };
			promptStub.mockResolvedValue(promptResult);
			const passphrase = await getPassphraseFromPrompt(displayName);
			expect(passphrase).toEqual(promptResult.passphrase);
		});

		it('should prompt once with shouldRepeat false', async () => {
			const promptResult = { passphrase: defaultInputs };
			promptStub.mockResolvedValue(promptResult);
			await getPassphraseFromPrompt(displayName);
			return expect(inquirer.prompt).toHaveBeenCalledWith([
				{
					name: 'passphrase',
					type: 'password',
					message: `Please enter ${displayName}: `,
				},
			]);
		});

		it('should prompt twice with shouldRepeat true', async () => {
			const promptResult = { passphrase: defaultInputs, passphraseRepeat: defaultInputs };
			promptStub.mockResolvedValue(promptResult);
			await getPassphraseFromPrompt(displayName, true);
			expect(inquirer.prompt).toHaveBeenCalledWith([
				{
					name: 'passphrase',
					type: 'password',
					message: `Please enter ${displayName}: `,
				},
				{
					name: 'passphraseRepeat',
					type: 'password',
					message: `Please re-enter ${displayName}: `,
				},
			]);
		});

		it('should reject with error when repeated passphrase does not match', async () => {
			const promptResult = { passphrase: defaultInputs, passphraseRepeat: '456' };
			promptStub.mockResolvedValue(promptResult);
			await expect(getPassphraseFromPrompt(displayName, true)).rejects.toThrow(
				'Password was not successfully repeated.',
			);
		});
	});

	describe('isFileSource', () => {
		it('should return false when input is undefined', () => {
			expect(isFileSource()).toBe(false);
		});

		it('should return false when there is no source identifier', () => {
			expect(isFileSource('random string')).toBe(false);
		});

		it('should return true when it has correct source identifier', () => {
			expect(isFileSource('file:path/to/file')).toBe(true);
		});
	});

	describe('readFileSource', () => {
		const path = './some/path.txt';
		const source = `file:${path}`;
		const resultFileData = 'file data';

		beforeEach(() => {
			jest.spyOn(fs, 'readFileSync').mockReturnValue(resultFileData);
		});

		it('should read from file', async () => {
			await readFileSource(source);
			return expect(fs.readFileSync).toHaveBeenCalledWith(path, 'utf8');
		});

		it('should return the result from readFileSync', async () => {
			const data = await readFileSource(source);
			return expect(data).toEqual(resultFileData);
		});

		it('should throw error when source is empty', async () => {
			await expect(readFileSource()).rejects.toThrow('No data was provided.');
		});

		it('should throw error when source is not file', async () => {
			await expect(readFileSource('random string')).rejects.toThrow('Unknown data source type.');
		});

		it('should throw error when readFile throws ENOENT error', async () => {
			jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
				throw new Error('ENOENT');
			});
			await expect(readFileSource(source)).rejects.toThrow(`File at ${path} does not exist.`);
		});

		it('should throw error when readFile throws EACCES error', async () => {
			jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
				throw new Error('EACCES');
			});
			await expect(readFileSource(source)).rejects.toThrow(`File at ${path} could not be read.`);
		});
	});

	describe('readStdIn', () => {
		describe('when string without line break is given', () => {
			it('should resolve to a single element string array', async () => {
				const stdInContents = 'some contents';

				jest
					.spyOn(readline, 'createInterface')
					.mockReturnValue(createFakeInterface(stdInContents) as any);
				const result = await readStdIn();
				return expect(result).toEqual([stdInContents]);
			});
		});

		describe('when string with line break is given', () => {
			it('should resolve to a single element string array', async () => {
				const multilineStdContents = 'passphrase\npassword\ndata';

				jest
					.spyOn(readline, 'createInterface')
					.mockReturnValue(createFakeInterface(multilineStdContents) as any);
				const result = await readStdIn();
				return expect(result).toEqual(['passphrase', 'password', 'data']);
			});
		});
	});
});
