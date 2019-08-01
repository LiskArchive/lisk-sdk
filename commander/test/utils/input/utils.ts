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
import { expect } from 'chai';
import fs from 'fs';
import readline from 'readline';
import inquirer from 'inquirer';
import * as inputUtils from '../../../src/utils/input/utils';
import { FileSystemError, ValidationError } from '../../../src/utils/error';
import * as utilHelpers from '../../../src/utils/helpers';
import { createStreamStub, createFakeInterface } from '../../helpers/utils';
import { SinonStub } from 'sinon';

describe('input/utils utils', () => {
	describe('#splitSource', () => {
		it('should split into type and identifier', () => {
			const { sourceType, sourceIdentifier } = inputUtils.splitSource(
				'file:./utils.js',
			);
			expect(sourceType).to.be.equal('file');
			return expect(sourceIdentifier).to.be.equal('./utils.js');
		});

		it('should return the original input as sourceType and empty sourceIdentifier when no delimiter', () => {
			const { sourceType, sourceIdentifier } = inputUtils.splitSource(
				'file./utils.js',
			);
			expect(sourceType).to.be.equal('file./utils.js');
			return expect(sourceIdentifier).to.equal('');
		});
	});

	describe('#getStdIn', () => {
		const stdInContents = 'some contents';
		let createInterfaceStub: SinonStub;

		beforeEach(() => {
			createInterfaceStub = sandbox
				.stub(readline, 'createInterface')
				.returns(createFakeInterface(stdInContents));
			return Promise.resolve();
		});

		it('should resolve to empty object', () => {
			const result = inputUtils.getStdIn();
			return expect(result).to.eventually.eql({});
		});

		it('should resolve passphrase', () => {
			const options = {
				passphraseIsRequired: true,
			};
			const result = inputUtils.getStdIn(options);
			return expect(result).to.eventually.eql({
				data: undefined,
				passphrase: stdInContents,
				password: undefined,
				secondPassphrase: undefined,
			});
		});

		it('should resolve password', () => {
			const options = {
				passwordIsRequired: true,
			};
			const result = inputUtils.getStdIn(options);
			return expect(result).to.eventually.eql({
				data: undefined,
				passphrase: undefined,
				password: stdInContents,
				secondPassphrase: undefined,
			});
		});

		it('should resolve second passphrase', () => {
			const options = {
				secondPassphraseIsRequired: true,
			};
			const result = inputUtils.getStdIn(options);
			return expect(result).to.eventually.eql({
				data: undefined,
				passphrase: undefined,
				password: undefined,
				secondPassphrase: stdInContents,
			});
		});

		it('should resolve data', () => {
			const options = {
				dataIsRequired: true,
			};
			const result = inputUtils.getStdIn(options);
			return expect(result).to.eventually.eql({
				data: stdInContents,
				passphrase: undefined,
				password: undefined,
				secondPassphrase: undefined,
			});
		});

		describe('#getStdIn with multiline inputs', () => {
			const multilineStdContents =
				'passphrase\nsecondPassphrase\npassword\ndata';
			beforeEach(() => {
				return createInterfaceStub.returns(
					createFakeInterface(multilineStdContents),
				);
			});

			it('should resolve all the elements in order of secondPassphrase, password from stdin and rest in the data', () => {
				const options = {
					secondPassphraseIsRequired: true,
					passwordIsRequired: true,
				};
				const expectedResults = multilineStdContents.split('\n');
				const result = inputUtils.getStdIn(options);
				return expect(result).to.eventually.eql({
					passphrase: undefined,
					secondPassphrase: expectedResults[0],
					password: expectedResults[1],
					data: `${expectedResults[2]}\n${expectedResults[3]}`,
				});
			});

			it('should resolve all the elements in order of passphrase, password from stdin and rest in the data', () => {
				const options = {
					passphraseIsRequired: true,
					passwordIsRequired: true,
				};
				const expectedResults = multilineStdContents.split('\n');
				const result = inputUtils.getStdIn(options);
				return expect(result).to.eventually.eql({
					passphrase: expectedResults[0],
					secondPassphrase: undefined,
					password: expectedResults[1],
					data: `${expectedResults[2]}\n${expectedResults[3]}`,
				});
			});

			it('should resolve all the elements in order of passphrase, secondPassphrase, password, data from stdin', () => {
				const options = {
					passphraseIsRequired: true,
					secondPassphraseIsRequired: true,
					passwordIsRequired: true,
					dataIsRequired: true,
				};
				const expectedResults = multilineStdContents.split('\n');
				const result = inputUtils.getStdIn(options);
				return expect(result).to.eventually.eql({
					passphrase: expectedResults[0],
					secondPassphrase: expectedResults[1],
					password: expectedResults[2],
					data: expectedResults[3],
				});
			});
		});
	});

	describe('#getPassphraseFromPrompt', () => {
		const displayName = 'password';

		let promptStub: SinonStub;
		let stdoutisTTYStub: SinonStub;

		beforeEach(() => {
			stdoutisTTYStub = sandbox.stub(utilHelpers, 'stdoutIsTTY').returns(true);
			sandbox.stub(utilHelpers, 'stdinIsTTY').returns(true);
			promptStub = sandbox.stub(inquirer, 'prompt');
			return Promise.resolve();
		});

		it('passphrase should equal to the result of the prompt', async () => {
			const promptResult = { passphrase: '123' };
			promptStub.resolves(promptResult);
			const passphrase = await inputUtils.getPassphraseFromPrompt({
				displayName,
			});
			return expect(passphrase).to.equal(promptResult.passphrase);
		});

		it('should prompt once with shouldRepeat false', async () => {
			const promptResult = { passphrase: '123' };
			promptStub.resolves(promptResult);
			await inputUtils.getPassphraseFromPrompt({
				displayName,
			});
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
			await inputUtils.getPassphraseFromPrompt({
				shouldRepeat: true,
				displayName,
			});
			return expect(inquirer.prompt).to.be.calledWithExactly([
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

		it('should reject with error when repeated passphrase does not match', () => {
			const promptResult = { passphrase: '123', passphraseRepeat: '456' };
			promptStub.resolves(promptResult);
			return expect(
				inputUtils.getPassphraseFromPrompt({ shouldRepeat: true, displayName }),
			).to.be.rejectedWith(
				ValidationError,
				'Password was not successfully repeated.',
			);
		});

		it('should reject with error when in TTY mode', () => {
			stdoutisTTYStub.returns(false);
			const promptResult = { passphrase: '123', passphraseRepeat: '456' };
			promptStub.resolves(promptResult);
			return expect(
				inputUtils.getPassphraseFromPrompt({ displayName }),
			).to.be.rejectedWith(
				'Please enter password using a flag when piping data.',
			);
		});
	});

	describe('#getPassphraseFromEnvVariable', () => {
		const displayName = 'passphrase';
		let envPassphrase: string | undefined;
		before(() => {
			envPassphrase = process.env.PASSPHRASE;
			return Promise.resolve();
		});

		after(() => {
			if (envPassphrase) {
				process.env.PASSPHRASE = envPassphrase;
			} else {
				delete process.env.PASSPHRASE;
			}
			return Promise.resolve();
		});

		beforeEach(() => {
			delete process.env.PASSPHRASE;
			return Promise.resolve();
		});

		it('should reject with validation error when passphrase does not exist', () => {
			return expect(
				inputUtils.getPassphraseFromEnvVariable('PASSPHRASE', displayName),
			).to.be.rejectedWith(
				ValidationError,
				`Environmental variable for ${displayName} not set.`,
			);
		});

		it('should resolve with the set passphrase', () => {
			const passphrase = 'somepassphrase';
			process.env.PASSPHRASE = passphrase;
			return expect(
				inputUtils.getPassphraseFromEnvVariable('PASSPHRASE', displayName),
			).to.eventually.equal(passphrase);
		});
	});

	describe('#getPassphraseFromFile', () => {
		const filePath = '/path/to/the/passphrase.txt';

		describe('when file does not exist', () => {
			beforeEach(() => {
				const error = new Error('ENOENT: no such file or directory');
				const streamStub = createStreamStub(
					(type: string, callback: Function) =>
						type === 'error' && callback(error),
				);
				return sandbox.stub(fs, 'createReadStream').returns(streamStub);
			});

			it('should throw an error', () => {
				return expect(
					inputUtils.getPassphraseFromFile(filePath),
				).to.be.rejectedWith(
					FileSystemError,
					`File at ${filePath} does not exist.`,
				);
			});
		});

		describe('when file cannot be read', () => {
			beforeEach(() => {
				const error = new Error('EACCES: permission denied');
				const streamStub = createStreamStub(
					(type: string, callback: Function) =>
						type === 'error' && callback(error),
				);
				return sandbox.stub(fs, 'createReadStream').returns(streamStub);
			});

			it('should throw an error', () => {
				return expect(
					inputUtils.getPassphraseFromFile(filePath),
				).to.be.rejectedWith(
					FileSystemError,
					`File at ${filePath} could not be read.`,
				);
			});
		});

		describe('when unknown error occor while reading the file', () => {
			beforeEach(() => {
				const error = new Error('random error');
				const streamStub = createStreamStub(
					(type: string, callback: Function) =>
						type === 'error' && callback(error),
				);
				return sandbox.stub(fs, 'createReadStream').returns(streamStub);
			});

			it('should throw an error when file does not exist', () => {
				return expect(
					inputUtils.getPassphraseFromFile(filePath),
				).to.be.rejectedWith(Error, 'random error');
			});
		});

		describe('when file can be read', () => {
			const fileContents = 'password';
			beforeEach(() => {
				return sandbox
					.stub(readline, 'createInterface')
					.returns(createFakeInterface(fileContents));
			});

			it('should resolve to the fileContents', () => {
				return expect(
					inputUtils.getPassphraseFromFile(filePath),
				).to.eventually.equal(fileContents);
			});
		});
	});

	describe('#getPassphraseFromSource', () => {
		const displayName = 'password';
		const password = 'somepassword';
		let envPassword: string | undefined;
		before(() => {
			envPassword = process.env.PASSWORD;
			return Promise.resolve();
		});

		after(() => {
			if (envPassword) {
				process.env.PASSWORD = envPassword;
			} else {
				delete process.env.PASSWORD;
			}
			return Promise.resolve();
		});

		beforeEach(() => {
			return sandbox
				.stub(readline, 'createInterface')
				.returns(createFakeInterface(password));
		});

		it('should get from env', () => {
			const key = 'PASSWORD';
			process.env[key] = password;
			return expect(
				inputUtils.getPassphraseFromSource(`env:${key}`, { displayName }),
			).to.eventually.equal(password);
		});

		it('should get from file', () => {
			const file = '/some/file.txt';
			return expect(
				inputUtils.getPassphraseFromSource(`file:${file}`, { displayName }),
			).to.eventually.equal(password);
		});

		it('should get from unsafe plaintext', () => {
			return expect(
				inputUtils.getPassphraseFromSource(`pass:${password}`, { displayName }),
			).to.eventually.equal(password);
		});

		it('should reject with validation error when source is unknown', () => {
			return expect(
				inputUtils.getPassphraseFromSource(`unknown:${password}`, {
					displayName,
				}),
			).to.be.rejectedWith(
				ValidationError,
				'Password was provided with an unknown source type. Must be one of `env`, `file`, or `stdin`. Leave blank for prompt.',
			);
		});
	});

	describe('#getPassphrase', () => {
		const displayName = 'password';
		const password = 'somepassword';

		beforeEach(() => {
			sandbox.stub(utilHelpers, 'stdoutIsTTY').returns(true);
			sandbox.stub(utilHelpers, 'stdinIsTTY').returns(true);
			return sandbox
				.stub(inquirer, 'prompt')
				.resolves({ passphrase: password });
		});

		it('should get the passphrase from source', () => {
			return expect(
				inputUtils.getPassphrase(`pass:${password}`, { displayName }),
			).to.eventually.equal(password);
		});

		it('should get the passphrase from prompt', () => {
			return expect(
				inputUtils.getPassphrase('prompt', { displayName }),
			).to.eventually.equal(password);
		});
	});

	describe('#handleReadFileErrors', () => {
		const path = './some/path.txt';

		it('should throw with file does not exist error', () => {
			const error = new Error('ENOENT: no such file or directory');
			return expect(inputUtils.handleReadFileErrors(path).bind(null, error))
				.to.throw()
				.and.be.customError(
					new FileSystemError(`File at ${path} does not exist.`),
				);
		});

		it('should throw with file cannot be read error', () => {
			const error = new Error('EACCES: permission denied');
			return expect(inputUtils.handleReadFileErrors(path).bind(null, error))
				.to.throw()
				.and.be.customError(
					new FileSystemError(`File at ${path} could not be read.`),
				);
		});

		it('should throw with original error', () => {
			const error = new Error('random error');
			return expect(
				inputUtils.handleReadFileErrors(path).bind(null, error),
			).to.throw(Error, error.message);
		});
	});

	describe('#getDataFromFile', () => {
		const path = './some/path.txt';
		const resultFileData = 'file data';

		beforeEach(() => {
			return sandbox.stub(fs, 'readFileSync').returns(resultFileData);
		});

		it('should read from file', async () => {
			await inputUtils.getDataFromFile(path);
			return expect(fs.readFileSync).to.be.calledWithExactly(path, 'utf8');
		});

		it('should return the result from readFileSync', async () => {
			const data = await inputUtils.getDataFromFile(path);
			return expect(data).to.equal(resultFileData);
		});
	});

	describe('#getData', () => {
		const path = './some/path.txt';
		const resultFileData = 'file data';

		let readFileSyncStub: SinonStub;

		beforeEach(() => {
			readFileSyncStub = sandbox
				.stub(fs, 'readFileSync')
				.returns(resultFileData);
			return Promise.resolve();
		});

		it('should throw validation error when source is empty', () => {
			return expect(inputUtils.getData()).to.be.rejectedWith(
				ValidationError,
				'No data was provided.',
			);
		});

		it('should throw validation error when source is not file', () => {
			return expect(inputUtils.getData('pass:password')).to.be.rejectedWith(
				ValidationError,
				'Unknown data source type.',
			);
		});

		it('should get data from file', async () => {
			await inputUtils.getData(`file:${path}`);
			return expect(fs.readFileSync).to.be.calledWithExactly(path, 'utf8');
		});

		it('should return the result from readFileSync', async () => {
			const data = await inputUtils.getData(`file:${path}`);
			return expect(data).to.equal(resultFileData);
		});

		it('should be rejected if an error occurs', () => {
			const error = new Error('some random error');
			readFileSyncStub.throws(error);
			return expect(inputUtils.getData(`file:${path}`)).to.be.rejectedWith(
				Error,
				error.message,
			);
		});
	});
});
