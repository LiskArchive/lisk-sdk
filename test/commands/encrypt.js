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
import * as input from '../../src/utils/input';
import tablify from '../../src/utils/tablify';
import { setUpVorpalWithCommand } from './utils';

const createStreamStub = on => ({
	resume: () => {},
	close: () => {},
	on,
});

const prepareRow = row => row.split('│').filter(Boolean).map(s => s.trim());
const parseTable = (output) => {
	const rows = output.split('\n');
	return {
		head: prepareRow(rows[1]),
		body: prepareRow(rows[3]),
	};
};

const createStringCommand = cliCommand => `
	var Vorpal = require('vorpal');
	var encrypt = require('./src/commands/encrypt').default;

	var vorpal = new Vorpal();
	vorpal.use(encrypt);
	vorpal.exec('${cliCommand}');
`.trim();

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

		it('should require 1 input', () => {
			const argsFilter = arg => arg.required;
			const encryptCommand = vorpal.commands.filter(commandFilter)[0];
			// eslint-disable-next-line no-underscore-dangle
			const requiredArgs = encryptCommand._args.filter(argsFilter);
			(requiredArgs).should.have.length(1);
		});
	});

	describe('when executed', () => {
		const message = 'Hello Lisker';
		const multilineMessage = 'Some important message\nthat spans\nmultiple lines\n';
		const secret = 'pass phrase';
		const recipient = 'bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0';

		const nonce = '60ee6cbb5f9f0ee3736a6ffd20317f59ebfee2083e819909';
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

		describe('passphrase', () => {
			const command = `encrypt ${recipient} "${message}"`;
			const jsonCommand = `${command} --json`;
			const jCommand = `${command} -j`;
			const noJsonCommand = `${command} --no-json`;

			describe('with passphrase passed via prompt', () => {
				let promptStub;

				beforeEach(() => {
					promptStub = sinon.stub(input, 'getPassphraseFromPrompt').resolves(secret);
				});

				afterEach(() => {
					promptStub.restore();
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
						promptStub.rejects(new Error('Passphrase verification failed.'));
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
						const tableOutputError = tablify({ error: 'Could not encrypt: File does not exist.' }).toString();
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
						const tableOutputError = tablify({ error: 'Could not encrypt: File could not be read.' }).toString();
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

			describe('with passphrase passed via stdin', function withPassphrasePassedViaStdIn() {
				this.timeout(5e3);

				const passPhraseStdInCommand = `${command} --passphrase stdin`;
				const cliCommand = passPhraseStdInCommand.replace(/"/g, '\\"');
				const liskyCommand = createStringCommand(cliCommand);
				const childCommand = `echo "${secret}" | babel-node -e "${liskyCommand}"`;

				it('should use the passphrase without a prompt', () => {
					return new Promise((resolve) => {
						exec(childCommand, (_, stdout) => {
							resolve(stdout);
						});
					})
						.then((stdout) => {
							const { head, body } = parseTable(stdout);

							(head).should.eql(['nonce', 'encryptedMessage']);
							(body[0]).should.be.hexString().and.have.length(48);
							(body[1]).should.be.hexString();
						});
				});
			});

			describe('with invalid passphrase source specified', () => {
				const passPhraseInvalidCommand = `${command} --passphrase unknown:${secret}`;

				it('should inform the user that the source type is invalid', () => {
					const tableOutputError = tablify({ error: 'Unknown passphrase source type: Must be one of `env`, `file`, or `stdin`. Leave blank for prompt.' }).toString();
					return vorpal.exec(passPhraseInvalidCommand)
						.then(() => (capturedOutput[0]).should.equal(tableOutputError));
				});
			});
		});

		describe('message', () => {
			const command = `encrypt ${recipient} --passphrase "pass:${secret}"`;

			describe('with plaintext message passed via command line', () => {
				const messagePlainTextCommand = `${command} "${message}"`;

				it('should call the crypto module encrypt method with correct parameters', () => {
					return vorpal.exec(messagePlainTextCommand)
						.then(() => {
							(encryptStub.calledWithExactly(message, secret, recipient))
								.should.be.true();
						});
				});
			});

			describe('with message passed via file path', () => {
				const messageFileCommand = `${command} --message file:/path/to/message.txt`;

				let readFileSyncStub;

				describe('if file does not exist', () => {
					let doesNotExistError;

					beforeEach(() => {
						doesNotExistError = new Error('ENOENT: no such file or directory');
						readFileSyncStub = sinon.stub(fse, 'readFileSync').throws(doesNotExistError);
						return vorpal.exec(messageFileCommand);
					});

					afterEach(() => {
						readFileSyncStub.restore();
					});

					it('should inform the user that the file does not exist', () => {
						const tableOutputError = tablify({ error: 'Could not encrypt: File does not exist.' }).toString();
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
						readFileSyncStub = sinon.stub(fse, 'readFileSync').throws(permissionError);
						return vorpal.exec(messageFileCommand);
					});

					afterEach(() => {
						readFileSyncStub.restore();
					});

					it('should inform the user that the file cannot be read', () => {
						const tableOutputError = tablify({ error: 'Could not encrypt: File could not be read.' }).toString();
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
						readFileSyncStub = sinon.stub(fse, 'readFileSync').throws(unknownError);
					});

					afterEach(() => {
						readFileSyncStub.restore();
					});

					it('should print the error message if it has one', () => {
						const tableOutputError = tablify({ error: unknownErrorMessage }).toString();
						return vorpal.exec(messageFileCommand)
							.then(() => (capturedOutput[0]).should.equal(tableOutputError));
					});

					it('should print the error name if it has no message', () => {
						delete unknownError.message;
						const name = 'Dr Error';
						unknownError.name = name;
						const tableOutputError = tablify({ error: name }).toString();

						return vorpal.exec(messageFileCommand)
							.then(() => (capturedOutput[0]).should.equal(tableOutputError));
					});
				});

				describe('if file can be read', () => {
					beforeEach(() => {
						readFileSyncStub = sinon.stub(fse, 'readFileSync').returns(multilineMessage);
					});

					afterEach(() => {
						readFileSyncStub.restore();
					});

					it('should call the crypto module encrypt method with correct parameters', () => {
						return vorpal.exec(messageFileCommand)
							.then(() => {
								(encryptStub.calledWithExactly(multilineMessage, secret, recipient))
									.should.be.true();
							});
					});
				});
			});

			describe('with message passed via stdin', function withMessagePassedViaStdIn() {
				this.timeout(5e3);

				const messageStdInCommand = `${command} --message stdin`;
				const cliCommand = messageStdInCommand.replace(/"/g, '\\"');
				const liskyCommand = createStringCommand(cliCommand);
				const childCommand = `echo "${multilineMessage}" | babel-node -e "${liskyCommand}"`;

				it('should use the message without a prompt', () => {
					return new Promise((resolve) => {
						exec(childCommand, (_, stdout) => {
							resolve(stdout);
						});
					})
						.then((stdout) => {
							const { head, body } = parseTable(stdout);

							(head).should.eql(['nonce', 'encryptedMessage']);
							(body[0]).should.be.hexString().and.have.length(48);
							(body[1]).should.be.hexString();
						});
				});
			});

			describe('with invalid message source specified', () => {
				const invalidMessageSourceCommand = `${command} --message "unknown:${message}"`;

				it('should inform the user that an invalid message source has been provided', () => {
					const tableOutputError = tablify({ error: 'Unknown message source type: Must be one of `file`, or `stdin`.' }).toString();
					return vorpal.exec(invalidMessageSourceCommand)
						.then(() => (capturedOutput[0]).should.equal(tableOutputError));
				});
			});

			describe('with no message source specified', () => {
				it('should inform the user that no message has been provided', () => {
					const tableOutputError = tablify({ error: 'Could not encrypt: No message was provided.' }).toString();
					return vorpal.exec(command)
						.then(() => (capturedOutput[0]).should.equal(tableOutputError));
				});
			});
		});

		describe('with passphrase and message passed via stdin', function withPassphraseAndMessagePassedViaStdin() {
			this.timeout(5e3);

			const passphraseAndMessageStdInCommand = `encrypt ${recipient} --message stdin --passphrase stdin`;
			const liskyCommand = createStringCommand(passphraseAndMessageStdInCommand);
			const childCommand = `echo "${secret}\n${multilineMessage}" | babel-node -e "${liskyCommand}"`;

			it('should should successfully encrypt the message with the passphrase', () => {
				return new Promise((resolve) => {
					exec(childCommand, (_, stdout) => {
						resolve(stdout);
					});
				})
					.then((stdout) => {
						const { head, body } = parseTable(stdout);

						(head).should.eql(['nonce', 'encryptedMessage']);
						(body[0]).should.be.hexString().and.have.length(48);
						(body[1]).should.be.hexString();
					});
			});
		});
	});
});
