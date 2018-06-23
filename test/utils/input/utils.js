/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import * as inputUtils from '../../../src/utils/input/utils';
import { FileSystemError, ValidationError } from '../../../src/utils/error';
import { createStreamStub, createFakeInterface } from '../../utils';

describe('input/utils utils', () => {
	describe('#splitSource', () => {
		it('should split into type and identifier', () => {
			const { sourceType, sourceIdentifier } = inputUtils.splitSource(
				'file:./utils.js',
			);
			expect(sourceType).to.be.equal('file');
			return expect(sourceIdentifier).to.be.equal('./utils.js');
		});
	});

	describe('#getStdIn', () => {
		const stdContents = 'some contents';
		beforeEach(() => {
			return sandbox
				.stub(readline, 'createInterface')
				.returns(createFakeInterface(stdContents));
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
				data: null,
				passphrase: stdContents,
				password: null,
				secondPassphrase: null,
			});
		});

		it('should resolve password', () => {
			const options = {
				passwordIsRequired: true,
			};
			const result = inputUtils.getStdIn(options);
			return expect(result).to.eventually.eql({
				data: null,
				passphrase: null,
				password: stdContents,
				secondPassphrase: null,
			});
		});

		it('should resolve second passphrase', () => {
			const options = {
				secondPassphraseIsRequired: true,
			};
			const result = inputUtils.getStdIn(options);
			return expect(result).to.eventually.eql({
				data: null,
				passphrase: null,
				password: null,
				secondPassphrase: stdContents,
			});
		});

		it('should resolve data', () => {
			const options = {
				dataIsRequired: true,
			};
			const result = inputUtils.getStdIn(options);
			return expect(result).to.eventually.eql({
				data: stdContents,
				passphrase: null,
				password: null,
				secondPassphrase: null,
			});
		});
	});

	describe('#getPassphraseFromPrompt', () => {
		let promptStub;
		const displayName = 'password';
		beforeEach(() => {
			promptStub = sandbox.stub(inquirer, 'prompt');
			return Promise.resolve();
		});

		it('should prompt once with shouldRepeat false', async () => {
			const expected = { passphrase: '123', passphraseRepeat: '123' };
			promptStub.resolves(expected);
			const passphrase = await inputUtils.getPassphraseFromPrompt({
				displayName,
			});
			expect(passphrase).to.equal(expected.passphrase);
			return expect(promptStub).to.be.calledWithExactly([
				{
					name: 'passphrase',
					type: 'password',
					message: `Please enter ${displayName}: `,
				},
			]);
		});

		it('should prompt twice with shouldRepeat true', async () => {
			const expected = { passphrase: '123', passphraseRepeat: '123' };
			promptStub.resolves(expected);
			const passphrase = await inputUtils.getPassphraseFromPrompt({
				shouldRepeat: true,
				displayName,
			});
			expect(passphrase).to.equal(expected.passphrase);
			return expect(promptStub).to.be.calledWithExactly([
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
			const expected = { passphrase: '123', passphraseRepeat: '456' };
			promptStub.resolves(expected);
			return expect(
				inputUtils.getPassphraseFromPrompt({ shouldRepeat: true, displayName }),
			).to.be.rejectedWith(
				ValidationError,
				'Password was not successfully repeated.',
			);
		});
	});

	describe('#getPassphraseFromEnvVariable', () => {
		const displayName = 'passphrase';
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
					(type, callback) => type === 'error' && callback(error),
				);
				sandbox
					.stub(fs, 'accessSync')
					.withArgs(filePath, fs.constants.R_OK)
					.throws('Cannot read file');
				sandbox.stub(fs, 'readFileSync').throws(error);
				return sandbox.stub(fs, 'createReadStream').returns(streamStub);
			});

			it('should throw an error when file does not exist', () => {
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
					(type, callback) => type === 'error' && callback(error),
				);
				sandbox
					.stub(fs, 'accessSync')
					.withArgs(filePath, fs.constants.R_OK)
					.throws('Cannot read file');
				sandbox.stub(fs, 'readFileSync').throws(error);
				return sandbox.stub(fs, 'createReadStream').returns(streamStub);
			});

			it('should throw an error when file does not exist', () => {
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
					(type, callback) => type === 'error' && callback(error),
				);
				sandbox.stub(fs, 'readFileSync').throws(error);
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
				const streamStub = createStreamStub(
					(type, callback) =>
						// istanbul ignore next
						type === 'data' && setImmediate(() => callback(fileContents)),
				);
				sandbox
					.stub(readline, 'createInterface')
					.returns(createFakeInterface(fileContents));
				sandbox.stub(fs, 'createReadStream').returns(streamStub);
				return sandbox.stub(fs, 'readFileSync').returns(fileContents);
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

		it('should get from pass', () => {
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

		it('should throw with non file existing error', () => {
			const error = new Error('ENOENT: no such file or directory');
			return expect(inputUtils.handleReadFileErrors(path).bind(null, error))
				.to.throw()
				.and.be.customError(
					new FileSystemError(`File at ${path} does not exist.`),
				);
		});

		it('should throw with file cannot be read', () => {
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
			).to.throw(Error, 'random error');
		});
	});

	describe('#getDataFromFile', () => {
		const path = './some/path.txt';
		let readFileStub;

		beforeEach(() => {
			readFileStub = sandbox.stub(fs, 'readFileSync');
			return Promise.resolve();
		});

		it('should read from file', async () => {
			await inputUtils.getDataFromFile(path);
			return expect(readFileStub).to.be.calledWithExactly(path, 'utf8');
		});
	});
	describe('#getData', () => {
		const path = './some/path.txt';
		let readFileStub;

		beforeEach(() => {
			readFileStub = sandbox.stub(fs, 'readFileSync');
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
			return expect(readFileStub).to.be.calledWithExactly(path, 'utf8');
		});

		it('should rejected with error', () => {
			const error = new Error('some random error');
			readFileStub.throws(error);
			return expect(inputUtils.getData(`file:${path}`)).to.be.rejectedWith(
				Error,
				error.message,
			);
		});
	});
});
