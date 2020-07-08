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
import * as sandbox from 'sinon';
import { expect } from 'chai';
import fs from 'fs';
import readline from 'readline';
import inquirer from 'inquirer';
import { SinonStub } from 'sinon';
import { createFakeInterface } from '../helpers/utils';
import {
	readStdIn,
	getPassphraseFromPrompt,
	isFileSource,
	readFileSource,
} from '../../src/utils/reader';
import { FileSystemError, ValidationError } from '../../src/utils/error';

describe('reader', () => {
	describe('readPassphraseFromPrompt', () => {
		const displayName = 'password';
		let promptStub: SinonStub;

		beforeEach(() => {
			promptStub = sandbox.stub(inquirer, 'prompt');
		});

		it('passphrase should equal to the result of the prompt', async () => {
			const promptResult = { passphrase: '123' };
			promptStub.resolves(promptResult);
			const passphrase = await getPassphraseFromPrompt(displayName);
			expect(passphrase).to.equal(promptResult.passphrase);
		});

		it('should prompt once with shouldRepeat false', async () => {
			const promptResult = { passphrase: '123' };
			promptStub.resolves(promptResult);
			await getPassphraseFromPrompt(displayName);
			return expect(inquirer.prompt).to.be.calledWithExactly([
				{
					name: 'passphrase',
					type: 'password',
					message: `Please enter ${displayName}: `,
				},
			]);
		});

		it('should prompt twice with shouldRepeat true', async () => {
			const promptResult = { passphrase: '123', passphraseRepeat: '123' };
			promptStub.resolves(promptResult);
			await getPassphraseFromPrompt(displayName, true);
			expect(inquirer.prompt).to.be.calledWithExactly([
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
			const promptResult = { passphrase: '123', passphraseRepeat: '456' };
			promptStub.resolves(promptResult);
			await expect(getPassphraseFromPrompt(displayName, true)).to.be.rejectedWith(
				ValidationError,
				'Password was not successfully repeated.',
			);
		});
	});

	describe('isFileSource', () => {
		it('should return false when input is undefined', () => {
			expect(isFileSource()).to.be.false;
		});

		it('should return false when there is no source identifier', () => {
			expect(isFileSource('random string')).to.be.false;
		});

		it('should return true when it has correct source identifier', () => {
			expect(isFileSource('file:path/to/file')).to.be.true;
		});
	});

	describe('readFileSource', () => {
		const path = './some/path.txt';
		const source = `file:${path}`;
		const resultFileData = 'file data';

		beforeEach(() => {
			sandbox.stub(fs, 'readFileSync').returns(resultFileData);
		});

		it('should read from file', async () => {
			await readFileSource(source);
			return expect(fs.readFileSync).to.be.calledWithExactly(path, 'utf8');
		});

		it('should return the result from readFileSync', async () => {
			const data = await readFileSource(source);
			return expect(data).to.equal(resultFileData);
		});

		it('should throw error when source is empty', async () => {
			await expect(readFileSource()).to.be.rejectedWith(ValidationError, 'No data was provided.');
		});

		it('should throw error when source is not file', async () => {
			await expect(readFileSource('random string')).to.be.rejectedWith(
				ValidationError,
				'Unknown data source type.',
			);
		});

		it('should throw error when readFile throws ENOENT error', async () => {
			(fs.readFileSync as SinonStub).throws(new Error('ENOENT'));
			await expect(readFileSource(source)).to.be.rejectedWith(
				FileSystemError,
				`File at ${path} does not exist.`,
			);
		});

		it('should throw error when readFile throws EACCES error', async () => {
			(fs.readFileSync as SinonStub).throws(new Error('EACCES'));
			await expect(readFileSource(source)).to.be.rejectedWith(
				FileSystemError,
				`File at ${path} could not be read.`,
			);
		});
	});

	describe('readStdIn', () => {
		describe('when string without linebreak is given', () => {
			it('should resolve to a signle element string array', async () => {
				const stdInContents = 'some contents';

				sandbox
					.stub(readline, 'createInterface')
					.returns(createFakeInterface(stdInContents) as any);
				const result = await readStdIn();
				return expect(result).to.eql([stdInContents]);
			});
		});

		describe('when string with linebreak is given', () => {
			it('should resolve to a signle element string array', async () => {
				const multilineStdContents = 'passphrase\npassword\ndata';

				sandbox
					.stub(readline, 'createInterface')
					.returns(createFakeInterface(multilineStdContents) as any);
				const result = await readStdIn();
				return expect(result).to.eql(['passphrase', 'password', 'data']);
			});
		});
	});
});
