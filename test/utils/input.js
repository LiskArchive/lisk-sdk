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
import {
	splitSource,
	getStdIn,
	createPromptOptions,
	getPassphraseFromPrompt,
	getPassphraseFromEnvVariable,
	getPassphraseFromFile,
	getPassphraseFromSource,
	getPassphrase,
	getFirstLineFromString,
	getDataFromFile,
	getData,
} from '../../src/utils/input';

const createStreamStub = on => ({
	resume: () => {},
	close: () => {},
	on,
});

describe('input utils', () => {
	const passphrase = 'minute omit local rare sword knee banner pair rib museum shadow juice';
	const badPassphrase = `${passphrase.slice(0, -1)}y`;
	const displayName = 'your custom passphrase';
	const envVariable = 'TEST_PASSPHRASE';
	const path = '/path/to/my/file.txt';
	const data = `${passphrase}\nsome other stuff on a new line`;

	const fileDoesNotExistErrorMessage = 'ENOENT: no such file or directory';
	const fileCannotBeReadErrorMessage = 'EACCES: permission denied';
	const unknownErrorMessage = 'unknown error';

	let promptStub;
	let vorpal;
	let initialEnvValue;

	before(() => {
		initialEnvValue = process.env[envVariable];
	});

	beforeEach(() => {
		promptStub = sandbox.stub().resolves({ passphrase });
		vorpal = {
			activeCommand: {
				prompt: promptStub,
			},
			ui: {},
		};
	});

	after(() => {
		if (typeof initialEnvValue !== 'undefined') {
			process.env[envVariable] = initialEnvValue;
		}
	});

	describe('#splitSource', () => {
		it('should split a source with delimiter', () => {
			const result = splitSource('someSource: this has spaces: and more colons ');
			const expected = {
				sourceType: 'someSource',
				sourceIdentifier: ' this has spaces: and more colons ',
			};
			(result).should.eql(expected);
		});

		it('should split a source without delimiter', () => {
			const result = splitSource('stdin');
			const expected = {
				sourceType: 'stdin',
				sourceIdentifier: '',
			};
			(result).should.eql(expected);
		});
	});

	describe('#getStdin', () => {
		const createFakeInterface = value => ({
			on: ((type, callback) => {
				if (type === 'line') {
					value.split('\n').forEach(callback);
				}
				if (type === 'close') {
					callback();
				}
				return createFakeInterface(value);
			}),
		});
		let createInterfaceStub;

		beforeEach(() => {
			createInterfaceStub = sandbox.stub(readline, 'createInterface');
		});

		describe('if neither passphrase nor data is requested', () => {
			it('should return an empty object if neither passphrase nor data is requested', () => {
				return (getStdIn()).should.be.fulfilledWith({});
			});
		});

		describe('if the passphrase is requested', () => {
			it('should get just the passphrase', () => {
				createInterfaceStub.returns(createFakeInterface(passphrase));
				return (getStdIn({ passphraseIsRequired: true }))
					.should.be.fulfilledWith({ passphrase });
			});
		});

		describe('if the data is requested', () => {
			it('should get just the data', () => {
				createInterfaceStub.returns(createFakeInterface(data));
				return (getStdIn({ dataIsRequired: true }))
					.should.be.fulfilledWith({ data, passphrase: null });
			});
		});

		describe('if both the passphrase and the data are requested', () => {
			it('should get both the passphrase and the data', () => {
				createInterfaceStub.returns(createFakeInterface(`${passphrase}\n${data}`));
				return (getStdIn({ passphraseIsRequired: true, dataIsRequired: true }))
					.should.be.fulfilledWith({ passphrase, data });
			});
		});
	});

	describe('#createPromptOptions', () => {
		it('should construct an options object for a message', () => {
			const message = 'Some message.';
			const result = createPromptOptions(message);
			const expected = {
				type: 'password',
				name: 'passphrase',
				message,
			};
			(result).should.eql(expected);
		});
	});

	describe('#getPassphraseFromPrompt', () => {
		it('should maintain the UI parent if already there', () => {
			const parent = { something: 'vorpal' };
			vorpal.ui.parent = parent;
			return getPassphraseFromPrompt(vorpal, { displayName })
				.then(() => {
					(vorpal.ui).should.have.property('parent').and.be.equal(parent);
				});
		});

		it('should set the UI parent on the vorpal instance', () => {
			return getPassphraseFromPrompt(vorpal, { displayName })
				.then(() => {
					(vorpal.ui).should.have.property('parent').and.be.equal(vorpal);
				});
		});

		it('should prompt for the pass phrase once', () => {
			return getPassphraseFromPrompt(vorpal, { displayName })
				.then(() => {
					(promptStub.calledOnce).should.be.true();
				});
		});

		it('should resolve to the provided passphrase', () => {
			return (getPassphraseFromPrompt(vorpal, { displayName }))
				.should.be.fulfilledWith(passphrase);
		});

		it('should use options', () => {
			return getPassphraseFromPrompt(vorpal, { displayName })
				.then(() => {
					(promptStub.calledWithExactly({
						type: 'password',
						name: 'passphrase',
						message: 'Please enter your custom passphrase: ',
					})).should.be.true();
				});
		});

		describe('with repetition', () => {
			it('should prompt for the pass phrase twice', () => {
				return getPassphraseFromPrompt(vorpal, { displayName, shouldRepeat: true })
					.then(() => {
						(promptStub.calledTwice).should.be.true();
					});
			});

			it('should resolve to the passphrase if successfully repeated', () => {
				return (getPassphraseFromPrompt(vorpal, { displayName, shouldRepeat: true }))
					.should.be.fulfilledWith(passphrase);
			});

			it('should use options', () => {
				return getPassphraseFromPrompt(vorpal, { displayName, shouldRepeat: true })
					.then(() => {
						(promptStub.secondCall.calledWithExactly({
							type: 'password',
							name: 'passphrase',
							message: 'Please re-enter your custom passphrase: ',
						})).should.be.true();
					});
			});

			it('should complain if the pass phrase is not successfully repeated', () => {
				promptStub.onSecondCall().resolves(badPassphrase);
				return (getPassphraseFromPrompt(vorpal, { displayName, shouldRepeat: true }))
					.should.be.rejectedWith({ message: 'Your custom passphrase was not successfully repeated.' });
			});
		});
	});

	describe('#getPassphraseFromEnvVariable', () => {
		it('should complain if the environmental variable is not set', () => {
			delete process.env[envVariable];
			return (getPassphraseFromEnvVariable(envVariable, displayName)).should.be.rejectedWith('Environmental variable for your custom passphrase not set.');
		});

		it('should resolve to the passphrase if the environmental variable is set', () => {
			process.env[envVariable] = passphrase;
			return (getPassphraseFromEnvVariable(envVariable)).should.be.fulfilled(passphrase);
		});
	});

	describe('#getPassphraseFromFile', () => {
		let streamStub;

		it('should complain if the file does not exist', () => {
			const doesNotExistError = new Error(fileDoesNotExistErrorMessage);
			streamStub = createStreamStub((type, callback) => type === 'error' && callback(doesNotExistError));
			sandbox.stub(fse, 'createReadStream').returns(streamStub);

			return (getPassphraseFromFile(path)).should.be.rejectedWith(`File at ${path} does not exist.`);
		});

		it('should complain if the file cannot be read', () => {
			const permissionError = new Error(fileCannotBeReadErrorMessage);
			streamStub = createStreamStub((type, callback) => type === 'error' && callback(permissionError));
			sandbox.stub(fse, 'createReadStream').returns(streamStub);

			return (getPassphraseFromFile(path)).should.be.rejectedWith(`File at ${path} could not be read.`);
		});

		it('should complain if an unknown error occurs', () => {
			const unknownError = new Error(unknownErrorMessage);
			streamStub = createStreamStub((type, callback) => type === 'error' && callback(unknownError));
			sandbox.stub(fse, 'createReadStream').returns(streamStub);

			return (getPassphraseFromFile(path)).should.be.rejectedWith(unknownErrorMessage);
		});

		it('should resolve to the first line of the file if the file can be read', () => {
			streamStub = createStreamStub((type, callback) => type === 'data' && setImmediate(() => callback(data)));
			sandbox.stub(fse, 'createReadStream').returns(streamStub);

			return (getPassphraseFromFile(path)).should.be.fulfilledWith(passphrase);
		});
	});

	describe('#getPassphraseFromSource', () => {
		let streamStub;

		beforeEach(() => {
			streamStub = createStreamStub((type, callback) => type === 'data' && setImmediate(() => callback(data)));
			sandbox.stub(fse, 'createReadStream').returns(streamStub);
		});

		it('should complain about an unknown source', () => {
			return (getPassphraseFromSource('unknown', { displayName })).should.be.rejectedWith('Your custom passphrase was provided with an unknown source type. Must be one of `env`, `file`, or `stdin`. Leave blank for prompt.');
		});

		it('should get passphrase from an environmental variable', () => {
			return (getPassphraseFromSource(`env:${envVariable}`, { displayName })).should.be.fulfilledWith(passphrase);
		});

		it('should get passphrase from a file', () => {
			return (getPassphraseFromSource(`file:${path}`, { displayName })).should.be.fulfilledWith(passphrase);
		});

		it('should resolve to a plaintext passphrase', () => {
			return (getPassphraseFromSource(`pass:${passphrase}`, { displayName })).should.be.fulfilledWith(passphrase);
		});
	});

	describe('#getPassphrase', () => {
		it('should get a passphrase from stdin if provided', () => {
			return (getPassphrase(null, null, passphrase)).should.be.fulfilledWith(passphrase);
		});

		it('should get a passphrase from a source if no stdin is provided', () => {
			const source = `pass:${passphrase}`;
			return (getPassphrase(null, source)).should.be.fulfilledWith(passphrase);
		});

		it('should get a passphrase from prompt if no stdin and no source is provided', () => {
			return (getPassphrase(vorpal)).should.be.fulfilledWith(passphrase);
		});
	});

	describe('#getFirstLineFromString', () => {
		it('should return null if no string is provided', () => {
			const result = getFirstLineFromString();
			should(result).be.null();
		});

		it('should return the first line of a multiline string', () => {
			const result = getFirstLineFromString('testing123\nplus some other stuff\non new lines');
			(result).should.be.eql('testing123');
		});
	});

	describe('#getDataFromFile', () => {
		let readFileSyncStub;

		beforeEach(() => {
			readFileSyncStub = sandbox.stub(fse, 'readFileSync').returns(data);
		});

		it('should read a file', () => {
			return getDataFromFile(path)
				.then(() => {
					(readFileSyncStub.calledWithExactly(path, 'utf8')).should.be.true();
				});
		});

		it('should resolve to the string data in the file', () => {
			return (getDataFromFile(path)).should.be.fulfilledWith(data);
		});
	});

	describe('getData', () => {
		let readFileSyncStub;

		beforeEach(() => {
			readFileSyncStub = sandbox.stub(fse, 'readFileSync').returns(data);
		});

		it('should complain if no data, no stdin and no source is provided', () => {
			return (getData())
				.should.be.rejectedWith('No data was provided.');
		});

		it('should resolve to data if provided directly', () => {
			return (getData(data))
				.should.be.fulfilledWith(data);
		});

		it('should resolve to data from stdin if provided', () => {
			return (getData(null, null, data))
				.should.be.fulfilledWith(data);
		});

		it('should complain if an unknown source is provided', () => {
			return (getData(null, 'unknown:source'))
				.should.be.rejectedWith('Unknown data source type. Must be one of `file`, or `stdin`.');
		});

		it('should complain if a provided file does not exist', () => {
			readFileSyncStub.throws(new Error(fileDoesNotExistErrorMessage));
			return (getData(null, `file:${path}`))
				.should.be.rejectedWith(`File at ${path} does not exist.`);
		});

		it('should complain if a provided file cannot be read', () => {
			readFileSyncStub.throws(new Error(fileCannotBeReadErrorMessage));
			return (getData(null, `file:${path}`))
				.should.be.rejectedWith(`File at ${path} could not be read.`);
		});

		it('should complain if an unknown error occurs while reading a provided file', () => {
			readFileSyncStub.throws(new Error(unknownErrorMessage));
			return (getData(null, `file:${path}`))
				.should.be.rejectedWith(unknownErrorMessage);
		});

		it('should get data from a file if provided', () => {
			return (getData(null, `file:${path}`))
				.should.be.fulfilledWith(data);
		});
	});
});
