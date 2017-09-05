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
		const command = `encrypt "${message}" "${recipient}"`;
		const jsonCommand = `${command} --json`;
		const jCommand = `${command} -j`;
		const noJsonCommand = `${command} --no-json`;
		const passPhraseFileCommand = `${command} --passphrase-file ~/path/to/secret.txt`;
		const passPhraseFileJsonCommand = `${passPhraseFileCommand} --json`;
		const passPhraseFileJCommand = `${passPhraseFileCommand} --j`;
		const passPhraseFileNoJsonCommand = `${passPhraseFileCommand} --no-json`;

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

		describe('with prompt for password', () => {
			const isTTY = process.stdin.isTTY;
			let promptStub;

			before(() => {
				process.stdin.isTTY = true;
			});

			beforeEach(() => {
				promptStub = sinon.stub(vorpal, 'prompt').resolves({ passphrase: secret });
			});

			afterEach(() => {
				promptStub.restore();
			});

			after(() => {
				process.stdin.isTTY = isTTY;
			});

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

		describe('with passphrase file passed as option', () => {
			let readFileStub;

			describe('if file does not exist', () => {
				beforeEach(() => {
					readFileStub = sinon.stub(fse, 'readFile').callsArgWith(1, new Error('ENOENT: no such file or directory'));
					return vorpal.exec(passPhraseFileCommand);
				});

				afterEach(() => {
					readFileStub.restore();
				});

				it('should inform the user that the file does not exist', () => {
					(capturedOutput[0]).should.equal('Could not encrypt: passphrase file does not exist.');
				});

				it('should not call the crypto module encrypt method', () => {
					(encryptStub.called).should.be.false();
				});
			});

			describe('if file cannot be read', () => {
				beforeEach(() => {
					readFileStub = sinon.stub(fse, 'readFile').callsArgWith(1, new Error('EACCES: permission denied'));
					return vorpal.exec(passPhraseFileCommand);
				});

				afterEach(() => {
					readFileStub.restore();
				});

				it('should inform the user that the file cannot be read', () => {
					(capturedOutput[0]).should.equal('Could not encrypt: passphrase file could not be read.');
				});

				it('should not call the crypto module encrypt method', () => {
					(encryptStub.called).should.be.false();
				});
			});

			describe('if an unexpected error occurs', () => {
				const unknownError = new Error('unknown error');

				beforeEach(() => {
					readFileStub = sinon.stub(fse, 'readFile').callsArgWith(1, unknownError);
				});

				afterEach(() => {
					readFileStub.restore();
				});

				it('should throw an error', () => {
					return vorpal.exec(passPhraseFileCommand)
						.then(result => (result).should.fail(), error => (error).should.equal(unknownError));
				});
			});

			describe('if file can be read', () => {
				beforeEach(() => {
					readFileStub = sinon.stub(fse, 'readFile').callsArgWith(1, null, `${secret}\n`);
				});

				afterEach(() => {
					readFileStub.restore();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					return vorpal.exec(passPhraseFileCommand)
						.then(() => {
							(encryptStub.calledWithExactly(message, secret, recipient))
								.should.be.true();
						});
				});

				describe('output', () => {
					it('should print the returned object', () => {
						return vorpal.exec(passPhraseFileCommand)
							.then(() => (capturedOutput[0]).should.equal(tableOutput));
					});

					it('should print json with --json option', () => {
						return vorpal.exec(passPhraseFileJsonCommand)
							.then(() => (capturedOutput[0]).should.equal(jsonOutput));
					});

					it('should handle a -j shorthand for --json option', () => {
						return vorpal.exec(passPhraseFileJCommand)
							.then(() => (capturedOutput[0]).should.equal(jsonOutput));
					});

					it('should print a table with --no-json option', () => {
						return vorpal.exec(passPhraseFileNoJsonCommand)
							.then(() => (capturedOutput[0]).should.equal(tableOutput));
					});
				});
			});
		});

		describe('with passphrase passed via stdin', function withPassphrasePassedViaStdIn() {
			this.timeout(5e3);

			const cliCommand = command.replace(/"/g, '\\"');
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
	});
});
