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
import fse from 'fs-extra';
import { exec } from 'child_process';
import encrypt from '../../src/commands/encrypt';
import cryptoModule from '../../src/utils/cryptoModule';
import tablify from '../../src/utils/tablify';
import { setUpVorpalWithCommand } from './utils';

const createStreamStub = on => ({
	resume: () => {},
	close: () => {},
	on,
});

describe('lisky encrypt command palette', () => {
	let vorpal;
	let capturedOutput;

	beforeEach(() => {
		capturedOutput = [];
		vorpal = setUpVorpalWithCommand(encrypt, capturedOutput);
	});

	afterEach(() => {
		vorpal.ui.removeAllListeners();
	});

	describe('setup', () => {
		// eslint-disable-next-line no-underscore-dangle
		const commandFilter = command => command._name === 'encrypt';

		it('should be available', () => {
			const encryptCommands = vorpal.commands.filter(commandFilter);
			(encryptCommands).should.have.length(1);
		});

		it('should require 2 inputs', () => {
			const argsFilter = arg => arg.required;
			const encryptCommand = vorpal.commands.filter(commandFilter)[0];
			// eslint-disable-next-line no-underscore-dangle
			const requiredArgs = encryptCommand._args.filter(argsFilter);
			(requiredArgs).should.have.length(2);
		});
	});

	describe('when executed', () => {
		const message = 'Hello Lisker';
		const secret = 'pass phrase';
		const recipient = 'bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0';
		const command = `encrypt "${message}" ${recipient}`;
		const jsonCommand = `${command} --json`;
		const jCommand = `${command} -j`;
		const noJsonCommand = `${command} --no-json`;

		const nonce = '60ee6callbackb5f9f0ee3736a6ffd20317f59ebfee2083e819909';
		const encryptedMessage = '4ba04a1c568b66fe5f6e670295cd9945730013f4e3feb5ac0b4e3c';
		const cryptoEncryptReturnObject = {
			nonce,
			encryptedMessage,
		};
		const tableOutput = tablify(cryptoEncryptReturnObject).toString();
		const jsonOutput = JSON.stringify(cryptoEncryptReturnObject);

		let encryptStub;

		beforeEach(() => {
			encryptStub = sinon
				.stub(cryptoModule, 'encrypt')
				.returns(cryptoEncryptReturnObject);
		});

		afterEach(() => {
			encryptStub.restore();
		});

		describe('with passphrase passed via prompt', () => {
			let promptStub;

			beforeEach(() => {
				promptStub = sinon.stub(vorpal, 'prompt').resolves({ passphrase: secret });
			});

			afterEach(() => {
				promptStub.restore();
			});

			it('should prompt for the password twice', () => {
				return vorpal.exec(command)
					.then(() => (promptStub.calledTwice).should.be.true());
			});

			describe('with matching passphrases', () => {
				it('should call the crypto module encrypt method with correct parameters', () => {
					return vorpal.exec(command)
						.then(() => (encryptStub.calledWithExactly(message, secret, recipient))
							.should.be.true(),
						);
				});

				describe('output', () => {
					it('should print the returned object', () => {
						return vorpal.exec(command)
							.then(() => (capturedOutput[0]).should.equal(tableOutput));
					});

					it('should print json with --json option', () => {
						return vorpal.exec(jsonCommand)
							.then(() => (capturedOutput[0]).should.equal(jsonOutput));
					});

					it('should handle a -j shorthand for --json option', () => {
						return vorpal.exec(jCommand)
							.then(() => (capturedOutput[0]).should.equal(jsonOutput));
					});

					it('should print a table with --no-json option', () => {
						return vorpal.exec(noJsonCommand)
							.then(() => (capturedOutput[0]).should.equal(tableOutput));
					});
				});
			});

			describe('with non-matching passphrases', () => {
				beforeEach(() => {
					promptStub.onSecondCall().resolves({ passphrase: 'not the secret' });
				});

				it('should inform the user the passwords did not match', () => {
					const tableOutputError = tablify({ error: 'Could not encrypt: Passphrase verification failed.' }).toString();
					return vorpal.exec(command)
						.then(() => (capturedOutput[0]).should.equal(tableOutputError));
				});
			});
		});

		describe('with plaintext passphrase passed via command line', () => {
			const passPhrasePlainTextCommand = `${command} --passphrase "pass:${secret}"`;

			it('should call the crypto module encrypt method with correct parameters', () => {
				return vorpal.exec(passPhrasePlainTextCommand)
					.then(() => {
						(encryptStub.calledWithExactly(message, secret, recipient))
							.should.be.true();
					});
			});
		});

		describe('with passphrase passed via environmental variable', () => {
			const envVariable = 'TEST_PASSPHRASE';
			const passPhraseEnvCommand = `${command} --passphrase env:${envVariable}`;
			let initialEnvValue;

			describe('if the environmental variable is not set', () => {
				before(() => {
					initialEnvValue = process.env[envVariable];
					delete process.env[envVariable];
				});

				after(() => {
					if (typeof initialEnvValue !== 'undefined') {
						process.env[envVariable] = initialEnvValue;
					}
				});

				it('should inform the user if the environmental variable is not set', () => {
					const tableOutputError = tablify({ error: 'Could not encrypt: Passphrase environmental variable not set.' }).toString();
					return vorpal.exec(passPhraseEnvCommand)
						.then(() => {
							(capturedOutput[0]).should.equal(tableOutputError);
						});
				});

				it('should not call the crypto module encrypt method', () => {
					return vorpal.exec(passPhraseEnvCommand)
						.then(() => {
							(encryptStub.called).should.be.false();
						});
				});
			});

			describe('if the environmental variable is set', () => {
				before(() => {
					initialEnvValue = process.env[envVariable];
					process.env[envVariable] = secret;
				});

				after(() => {
					if (typeof initialEnvValue === 'undefined') {
						delete process.env[envVariable];
					} else {
						process.env[envVariable] = initialEnvValue;
					}
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					return vorpal.exec(passPhraseEnvCommand)
						.then(() => {
							(encryptStub.calledWithExactly(message, secret, recipient))
								.should.be.true();
						});
				});
			});
		});

		describe('with passphrase passed via file path', () => {
			const passPhraseFileCommand = `${command} --passphrase file:/path/to/secret.txt`;

			let streamStub;
			let createReadStreamStub;

			describe('if file does not exist', () => {
				let doesNotExistError;

				beforeEach(() => {
					doesNotExistError = new Error('ENOENT: no such file or directory');
					streamStub = createStreamStub((type, callback) => type === 'error' && callback(doesNotExistError));
					createReadStreamStub = sinon.stub(fse, 'createReadStream').returns(streamStub);
					return vorpal.exec(passPhraseFileCommand);
				});

				afterEach(() => {
					createReadStreamStub.restore();
				});

				it('should inform the user that the file does not exist', () => {
					const tableOutputError = tablify({ error: 'Could not encrypt: Passphrase file does not exist.' }).toString();
					(capturedOutput[0]).should.equal(tableOutputError);
				});

				it('should not call the crypto module encrypt method', () => {
					(encryptStub.called).should.be.false();
				});
			});

			describe('if file cannot be read', () => {
				let permissionError;

				beforeEach(() => {
					permissionError = new Error('EACCES: permission denied');
					streamStub = createStreamStub((type, callback) => type === 'error' && callback(permissionError));
					createReadStreamStub = sinon.stub(fse, 'createReadStream').returns(streamStub);
					return vorpal.exec(passPhraseFileCommand);
				});

				afterEach(() => {
					createReadStreamStub.restore();
				});

				it('should inform the user that the file cannot be read', () => {
					const tableOutputError = tablify({ error: 'Could not encrypt: Passphrase file could not be read.' }).toString();
					(capturedOutput[0]).should.equal(tableOutputError);
				});

				it('should not call the crypto module encrypt method', () => {
					(encryptStub.called).should.be.false();
				});
			});

			describe('if an unexpected error occurs', () => {
				const unknownErrorMessage = 'unknown error';
				let unknownError;

				beforeEach(() => {
					unknownError = new Error(unknownErrorMessage);
					streamStub = createStreamStub((type, callback) => type === 'error' && callback(unknownError));
					createReadStreamStub = sinon.stub(fse, 'createReadStream').returns(streamStub);
				});

				afterEach(() => {
					createReadStreamStub.restore();
				});

				it('should print the error message if it has one', () => {
					const tableOutputError = tablify({ error: unknownErrorMessage }).toString();
					return vorpal.exec(passPhraseFileCommand)
						.then(() => (capturedOutput[0]).should.equal(tableOutputError));
				});

				it('should print the error name if it has no message', () => {
					delete unknownError.message;
					const name = 'Dr Error';
					unknownError.name = name;
					const tableOutputError = tablify({ error: name }).toString();

					return vorpal.exec(passPhraseFileCommand)
						.then(() => (capturedOutput[0]).should.equal(tableOutputError));
				});
			});

			describe('if file can be read', () => {
				beforeEach(() => {
					streamStub = createStreamStub((type, callback) => type === 'data' && setImmediate(() => callback(Buffer.from(`${secret}\nsome other stuff on a new line`))));
					createReadStreamStub = sinon.stub(fse, 'createReadStream').returns(streamStub);
				});

				afterEach(() => {
					createReadStreamStub.restore();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					return vorpal.exec(passPhraseFileCommand)
						.then(() => {
							(encryptStub.calledWithExactly(message, secret, recipient))
								.should.be.true();
						});
				});
			});
		});

		describe('with passphrase passed via file descriptor integer', () => {
			const passPhraseFileDescriptorCommand = `${command} --passphrase fd:115`;
			const passPhraseFileDescriptorCommandInvalid = `${command} --passphrase fd:115.4`;

			let streamStub;
			let createReadStreamStub;

			describe('if file descriptor is not an integer', () => {
				it('should inform the user that the file descriptor is invalid', () => {
					const tableOutputError = tablify({ error: 'Could not encrypt: Passphrase file descriptor is not an integer.' }).toString();
					return vorpal.exec(passPhraseFileDescriptorCommandInvalid)
						.then(() => (capturedOutput[0]).should.equal(tableOutputError));
				});
			});

			describe('if file descriptor is bad', () => {
				let badFileDescriptorError;

				beforeEach(() => {
					badFileDescriptorError = new Error('EBADF: bad file descriptor, read');
					streamStub = createStreamStub((type, callback) => type === 'error' && callback(badFileDescriptorError));
					createReadStreamStub = sinon.stub(fse, 'createReadStream').returns(streamStub);
					return vorpal.exec(passPhraseFileDescriptorCommand);
				});

				afterEach(() => {
					createReadStreamStub.restore();
				});

				it('should inform the user that the file descriptor is bad', () => {
					const tableOutputError = tablify({ error: 'Could not encrypt: Passphrase file descriptor is bad.' }).toString();
					(capturedOutput[0]).should.equal(tableOutputError);
				});

				it('should not call the crypto module encrypt method', () => {
					(encryptStub.called).should.be.false();
				});
			});

			describe('if file does not exist', () => {
				let doesNotExistError;

				beforeEach(() => {
					doesNotExistError = new Error('ENOENT: no such file or directory');
					streamStub = createStreamStub((type, callback) => type === 'error' && callback(doesNotExistError));
					createReadStreamStub = sinon.stub(fse, 'createReadStream').returns(streamStub);
					return vorpal.exec(passPhraseFileDescriptorCommand);
				});

				afterEach(() => {
					createReadStreamStub.restore();
				});

				it('should inform the user that the file does not exist', () => {
					const tableOutputError = tablify({ error: 'Could not encrypt: Passphrase file does not exist.' }).toString();
					(capturedOutput[0]).should.equal(tableOutputError);
				});

				it('should not call the crypto module encrypt method', () => {
					(encryptStub.called).should.be.false();
				});
			});

			describe('if file cannot be read', () => {
				let permissionError;

				beforeEach(() => {
					permissionError = new Error('EACCES: permission denied');
					streamStub = createStreamStub((type, callback) => type === 'error' && callback(permissionError));
					createReadStreamStub = sinon.stub(fse, 'createReadStream').returns(streamStub);
					return vorpal.exec(passPhraseFileDescriptorCommand);
				});

				afterEach(() => {
					createReadStreamStub.restore();
				});

				it('should inform the user that the file cannot be read', () => {
					const tableOutputError = tablify({ error: 'Could not encrypt: Passphrase file could not be read.' }).toString();
					(capturedOutput[0]).should.equal(tableOutputError);
				});

				it('should not call the crypto module encrypt method', () => {
					(encryptStub.called).should.be.false();
				});
			});

			describe('if an unexpected error occurs', () => {
				const unknownErrorMessage = 'unknown error';
				let unknownError;

				beforeEach(() => {
					unknownError = new Error(unknownErrorMessage);
					streamStub = createStreamStub((type, callback) => type === 'error' && callback(unknownError));
					createReadStreamStub = sinon.stub(fse, 'createReadStream').returns(streamStub);
				});

				afterEach(() => {
					createReadStreamStub.restore();
				});

				it('should print the error message if it has one', () => {
					const tableOutputError = tablify({ error: unknownErrorMessage }).toString();
					return vorpal.exec(passPhraseFileDescriptorCommand)
						.then(() => (capturedOutput[0]).should.equal(tableOutputError));
				});

				it('should print the error name if it has no message', () => {
					delete unknownError.message;
					const name = 'Dr Error';
					unknownError.name = name;
					const tableOutputError = tablify({ error: name }).toString();

					return vorpal.exec(passPhraseFileDescriptorCommand)
						.then(() => (capturedOutput[0]).should.equal(tableOutputError));
				});
			});

			describe('if file can be read', () => {
				const fileData = Buffer.from(`${secret}\nsome other stuff on a new line`);

				beforeEach(() => {
					streamStub = createStreamStub((type, callback) => {
						if (type === 'data') {
							setImmediate(() => callback(fileData));
						}
					});
					createReadStreamStub = sinon.stub(fse, 'createReadStream').returns(streamStub);
				});

				afterEach(() => {
					createReadStreamStub.restore();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					return vorpal.exec(passPhraseFileDescriptorCommand)
						.then(() => {
							(encryptStub.calledWithExactly(message, secret, recipient))
								.should.be.true();
						});
				});
			});
		});

		describe('with passphrase passed via stdin', function withPassphrasePassedViaStdIn() {
			this.timeout(5e3);
			const passPhraseStdInCommand = `${command} --passphrase stdin`;

			const cliCommand = passPhraseStdInCommand.replace(/"/g, '\\"');
			const liskyCommand = `
				var Vorpal = require('vorpal');
				var encrypt = require('./src/commands/encrypt').default;

				var vorpal = new Vorpal();
				vorpal.use(encrypt);
				vorpal.exec('${cliCommand}');
			`.trim();
			const childCommand = `echo "${secret}" | babel-node -e "${liskyCommand}"`;
			const prepareRow = row => row.split('│').filter(Boolean).map(s => s.trim());

			it('should use the passphrase without a prompt', () => {
				return new Promise((resolve) => {
					exec(childCommand, (_, stdout) => {
						resolve(stdout);
					});
				})
					.then((stdout) => {
						const rows = stdout.split('\n');
						const head = prepareRow(rows[1]);
						const body = prepareRow(rows[3]);

						(head).should.eql(['nonce', 'encryptedMessage']);
						(body[0]).should.be.hexString().and.have.length(48);
						(body[1]).should.be.hexString();
					});
			});
		});

		describe('with invalid passphrase source specified', () => {
			const passPhraseInvalidCommand = `${command} --passphrase unknown:sourceType`;

			it('should inform the user that the source type is invalid', () => {
				const tableOutputError = tablify({ error: 'Unknown passphrase source type: Must be one of `env`, `fd`, `file`, or `stdin`. Leave blank for prompt.' }).toString();
				return vorpal.exec(passPhraseInvalidCommand)
					.then(() => (capturedOutput[0]).should.equal(tableOutputError));
			});
		});
	});
});
