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
} from '../../src/utils/input';

const createStreamStub = on => ({
	resume: () => {},
	close: () => {},
	on,
});

describe('input utils', () => {
	const passphrase = 'minute omit local rare sword knee banner pair rib museum shadow juice';
	const badPassphrase = `${passphrase.slice(0, -1)}y`;
	const envVariable = 'TEST_PASSPHRASE';
	const path = '/path/to/my/file.txt';
	const data = `${passphrase}\nsome other stuff on a new line`;

	let promptStub;
	let vorpal;
	let initialEnvValue;

	before(() => {
		initialEnvValue = process.env[envVariable];
	});

	beforeEach(() => {
		promptStub = sinon.stub().resolves({ passphrase });
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
			createInterfaceStub = sinon.stub(readline, 'createInterface');
		});

		afterEach(() => {
			createInterfaceStub.restore();
		});

		describe('if neither passphrase nor data is requested', () => {
			it('should return an empty object if neither passphrase nor data is requested', () => {
				return (getStdIn({})).should.be.fulfilledWith({});
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
		it('should set the UI parent on the vorpal instance', () => {
			return getPassphraseFromPrompt(vorpal)
				.then(() => {
					(vorpal.ui).should.have.property('parent').and.be.equal(vorpal);
				});
		});

		it('prompt for the pass phrase twice', () => {
			return getPassphraseFromPrompt(vorpal)
				.then(() => {
					(promptStub.calledTwice).should.be.true();
				});
		});

		it('should resolve to the passphrase if successfully repeated', () => {
			return (getPassphraseFromPrompt(vorpal))
				.should.be.fulfilledWith(passphrase);
		});

		it('should complain if the pass phrase is not successfully repeated', () => {
			promptStub.onSecondCall().resolves(badPassphrase);
			return (getPassphraseFromPrompt(vorpal))
				.should.be.rejectedWith({ message: 'Passphrase verification failed.' });
		});
	});

	describe('#getPassphraseFromEnvVariable', () => {
		it('should complain if the environmental variable is not set', () => {
			delete process.env[envVariable];
			return (getPassphraseFromEnvVariable(envVariable)).should.be.rejectedWith('Passphrase environmental variable not set.');
		});

		it('should resolve to the passphrase if the environmental variable is set', () => {
			process.env[envVariable] = passphrase;
			return (getPassphraseFromEnvVariable(envVariable)).should.be.fulfilled(passphrase);
		});
	});

	describe('#getPassphraseFromFile', () => {
		let streamStub;
		let createReadStreamStub;

		afterEach(() => {
			createReadStreamStub.restore();
		});

		it('should complain if the file does not exist', () => {
			const doesNotExistError = new Error('ENOENT: no such file or directory');
			streamStub = createStreamStub((type, callback) => type === 'error' && callback(doesNotExistError));
			createReadStreamStub = sinon.stub(fse, 'createReadStream').returns(streamStub);

			return (getPassphraseFromFile(path)).should.be.rejectedWith('File does not exist.');
		});

		it('should complain if the file cannot be read', () => {
			const permissionError = new Error('EACCES: permission denied');
			streamStub = createStreamStub((type, callback) => type === 'error' && callback(permissionError));
			createReadStreamStub = sinon.stub(fse, 'createReadStream').returns(streamStub);

			return (getPassphraseFromFile(path)).should.be.rejectedWith('File could not be read.');
		});

		it('should complain if an unknown error occurs', () => {
			const unknownMessage = 'unknown error';
			const unknownError = new Error(unknownMessage);
			streamStub = createStreamStub((type, callback) => type === 'error' && callback(unknownError));
			createReadStreamStub = sinon.stub(fse, 'createReadStream').returns(streamStub);

			return (getPassphraseFromFile(path)).should.be.rejectedWith(unknownMessage);
		});

		it('should resolve to the first line of the file if the file can be read', () => {
			streamStub = createStreamStub((type, callback) => type === 'data' && setImmediate(() => callback(data)));
			createReadStreamStub = sinon.stub(fse, 'createReadStream').returns(streamStub);

			return (getPassphraseFromFile(path)).should.be.fulfilledWith(passphrase);
		});
	});

	describe('#getPassphraseFromSource', () => {
		let streamStub;
		let createReadStreamStub;

		beforeEach(() => {
			streamStub = createStreamStub((type, callback) => type === 'data' && setImmediate(() => callback(data)));
			createReadStreamStub = sinon.stub(fse, 'createReadStream').returns(streamStub);
		});

		afterEach(() => {
			createReadStreamStub.restore();
		});

		it('should complain about an unknown source', () => {
			return (getPassphraseFromSource('unknown')).should.be.rejectedWith('Unknown passphrase source type. Must be one of `env`, `file`, or `stdin`. Leave blank for prompt.');
		});

		it('should get passphrase from an environmental variable', () => {
			return (getPassphraseFromSource(`env:${envVariable}`)).should.be.fulfilledWith(passphrase);
		});

		it('should get passphrase from a file', () => {
			return (getPassphraseFromSource(`file:${path}`)).should.be.fulfilledWith(passphrase);
		});

		it('should resolve to a plaintext passphrase', () => {
			return (getPassphraseFromSource(`pass:${passphrase}`)).should.be.fulfilledWith(passphrase);
		});
	});

	describe('#getPassphrase', () => {
		it('should get a passphrase from stdin if provided', () => {
			const stdIn = { passphrase };
			return (getPassphrase(null, null, stdIn)).should.be.fulfilledWith(passphrase);
		});

		it('should get a passphrase from a source if no stdin is provided', () => {
			const source = `pass:${passphrase}`;
			return (getPassphrase(null, source, {})).should.be.fulfilledWith(passphrase);
		});

		it('should get a passphrase from prompt if no stdin and no source is provided', () => {
			return (getPassphrase(vorpal, null, {})).should.be.fulfilledWith(passphrase);
		});
	});
});
