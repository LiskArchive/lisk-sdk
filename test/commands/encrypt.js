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
import encrypt from '../../src/commands/encrypt';
import cryptoModule from '../../src/utils/cryptoModule';
import * as input from '../../src/utils/input';
import * as print from '../../src/utils/print';
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

		it('should require 1 input', () => {
			const argsFilter = arg => arg.required;
			const encryptCommand = vorpal.commands.filter(commandFilter)[0];
			// eslint-disable-next-line no-underscore-dangle
			const requiredArgs = encryptCommand._args.filter(argsFilter);
			(requiredArgs).should.have.length(1);
		});
	});

	describe('when executed', () => {
		const message = 'Some important message';
		const multilineMessage = 'Some important message\nthat spans\nmultiple lines\n';
		const secret = 'pass phrase';
		const recipient = 'bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0';
		const defaultPassphraseSource = `pass:${secret}`;
		const commandWithMessage = `encrypt ${recipient} "${message}"`;
		const commandWithPassphrase = `encrypt ${recipient} --passphrase "${defaultPassphraseSource}"`;

		const nonce = '60ee6cbb5f9f0ee3736a6ffd20317f59ebfee2083e819909';
		const encryptedMessage = '4ba04a1c568b66fe5f6e670295cd9945730013f4e3feb5ac0b4e3c';
		const cryptoEncryptReturnObject = {
			nonce,
			encryptedMessage,
		};
		const defaultErrorMessage = 'Some error message.';
		const wrappedErrorMessage = `Could not encrypt: ${defaultErrorMessage}`;

		let stdInResult;
		let getStdInStub;
		let getPassphraseStub;
		let getDataStub;
		let encryptStub;
		let printSpy;
		let printResultStub;

		beforeEach(() => {
			getStdInStub = sinon.stub(input, 'getStdIn').resolves({});
			getPassphraseStub = sinon.stub(input, 'getPassphrase').resolves(secret);
			getDataStub = sinon.stub(input, 'getData').resolves(message);
			encryptStub = sinon.stub(cryptoModule, 'encrypt').returns(cryptoEncryptReturnObject);
			printSpy = sinon.spy();
			printResultStub = sinon.stub(print, 'printResult').returns(printSpy);
		});

		afterEach(() => {
			getStdInStub.restore();
			getPassphraseStub.restore();
			getDataStub.restore();
			encryptStub.restore();
			printResultStub.restore();
		});

		describe('if the stdin cannot be retrieved', () => {
			beforeEach(() => {
				getStdInStub.rejects(new Error(defaultErrorMessage));
				return vorpal.exec(commandWithMessage);
			});

			it('should inform the user the encryption was not successful', () => {
				(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
				(printSpy.calledWithExactly({ error: wrappedErrorMessage })).should.be.true();
			});
		});

		describe('if an error occurs during encryption', () => {
			beforeEach(() => {
				encryptStub.rejects(new Error(defaultErrorMessage));
				return vorpal.exec(commandWithMessage);
			});

			it('should inform the user the encryption was not successful', () => {
				(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
				(printSpy.calledWithExactly({ error: wrappedErrorMessage })).should.be.true();
			});
		});

		describe('passphrase', () => {
			describe('if the passphrase cannot be retrieved', () => {
				beforeEach(() => {
					getPassphraseStub.rejects(new Error(defaultErrorMessage));
					return vorpal.exec(commandWithMessage);
				});

				it('should inform the user the encryption was not successful', () => {
					(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
					(printSpy.calledWithExactly({ error: wrappedErrorMessage })).should.be.true();
				});
			});

			describe('with passphrase passed via prompt', () => {
				beforeEach(() => {
					return vorpal.exec(commandWithMessage);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters', () => {
					(getPassphraseStub.calledWithExactly(vorpal, undefined, {}))
						.should.be.true();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					(encryptStub.calledWithExactly(message, secret, recipient))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptReturnObject)).should.be.true();
				});
			});

			describe('with plaintext passphrase passed via command line', () => {
				const passphraseSource = `pass:${secret}`;
				const passPhrasePlainTextCommand = `${commandWithMessage} --passphrase "${passphraseSource}"`;

				beforeEach(() => {
					return vorpal.exec(passPhrasePlainTextCommand);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase method with correct parameters', () => {
					(getPassphraseStub.calledWithExactly(vorpal, passphraseSource, {})).should.be.true();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					(encryptStub.calledWithExactly(message, secret, recipient)).should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: passphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptReturnObject)).should.be.true();
				});
			});

			describe('with passphrase passed via environmental variable', () => {
				const envVariable = 'TEST_PASSPHRASE';
				const passphraseSource = `env:${envVariable}`;
				const passPhraseEnvCommand = `${commandWithMessage} --passphrase ${passphraseSource}`;

				beforeEach(() => {
					return vorpal.exec(passPhraseEnvCommand);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with correct parameters', () => {
					(getPassphraseStub.calledWithExactly(vorpal, passphraseSource, {})).should.be.true();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					(encryptStub.calledWithExactly(message, secret, recipient)).should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: passphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptReturnObject)).should.be.true();
				});
			});

			describe('with passphrase passed via file path', () => {
				const passphraseSource = 'file:/path/to/secret.txt';
				const passPhraseFileCommand = `${commandWithMessage} --passphrase ${passphraseSource}`;

				beforeEach(() => {
					return vorpal.exec(passPhraseFileCommand);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase method with correct parameters', () => {
					(getPassphraseStub.calledWithExactly(vorpal, passphraseSource, {}))
						.should.be.true();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					(encryptStub.calledWithExactly(message, secret, recipient))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: passphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptReturnObject)).should.be.true();
				});
			});

			describe('with passphrase passed via stdin', () => {
				const passphraseSource = 'stdin';
				const passPhraseStdInCommand = `${commandWithMessage} --passphrase ${passphraseSource}`;

				beforeEach(() => {
					stdInResult = { passphrase: secret };
					getStdInStub.resolves(stdInResult);
					return vorpal.exec(passPhraseStdInCommand);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: true,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters', () => {
					(getPassphraseStub.calledWithExactly(vorpal, passphraseSource, stdInResult))
						.should.be.true();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					(encryptStub.calledWithExactly(message, secret, recipient))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: passphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptReturnObject)).should.be.true();
				});
			});
		});

		describe('message', () => {
			describe('if the message cannot be retrieved', () => {
				beforeEach(() => {
					getDataStub.rejects(new Error(defaultErrorMessage));
					return vorpal.exec(commandWithMessage);
				});

				it('should inform the user the encryption was not successful', () => {
					(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
					(printSpy.calledWithExactly({ error: wrappedErrorMessage })).should.be.true();
				});
			});

			describe('with message passed as a command line argument', () => {
				const messagePlainTextCommand = `${commandWithPassphrase} "${message}"`;

				beforeEach(() => {
					getDataStub.resolves(message);
					return vorpal.exec(messagePlainTextCommand);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters', () => {
					(getPassphraseStub.calledWithExactly(vorpal, defaultPassphraseSource, {}))
						.should.be.true();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					(encryptStub.calledWithExactly(message, secret, recipient))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: defaultPassphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptReturnObject)).should.be.true();
				});
			});

			describe('with message passed via file path', () => {
				const messageFileCommand = `${commandWithPassphrase} --message file:/path/to/message.txt`;

				beforeEach(() => {
					getDataStub.resolves(multilineMessage);
					return vorpal.exec(messageFileCommand);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters', () => {
					(getPassphraseStub.calledWithExactly(vorpal, defaultPassphraseSource, {}))
						.should.be.true();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					(encryptStub.calledWithExactly(multilineMessage, secret, recipient))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: defaultPassphraseSource, message: 'file:/path/to/message.txt' }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptReturnObject)).should.be.true();
				});
			});

			describe('with message passed via stdin', () => {
				const messageStdInCommand = `${commandWithPassphrase} --message stdin`;

				beforeEach(() => {
					stdInResult = { data: multilineMessage };
					getStdInStub.resolves(stdInResult);
					getDataStub.resolves(multilineMessage);
					return vorpal.exec(messageStdInCommand);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: true,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters', () => {
					(getPassphraseStub.calledWithExactly(vorpal, defaultPassphraseSource, stdInResult))
						.should.be.true();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					(encryptStub.calledWithExactly(multilineMessage, secret, recipient))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: defaultPassphraseSource, message: 'stdin' }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptReturnObject)).should.be.true();
				});
			});
		});

		describe('with passphrase and message passed via stdin', () => {
			const passphraseAndMessageStdInCommand = `encrypt ${recipient} --message stdin --passphrase stdin`;

			beforeEach(() => {
				stdInResult = { passphrase: secret, data: multilineMessage };
				getStdInStub.resolves(stdInResult);
				getDataStub.resolves(multilineMessage);
				return vorpal.exec(passphraseAndMessageStdInCommand);
			});

			it('should call the input util getStdIn with the correct parameters', () => {
				(getStdInStub.calledWithExactly({
					passphraseIsRequired: true,
					dataIsRequired: true,
				}))
					.should.be.true();
			});

			it('should call the input util getPassphrase with the correct parameters', () => {
				(getPassphraseStub.calledWithExactly(vorpal, 'stdin', stdInResult))
					.should.be.true();
			});

			it('should call the crypto module encrypt method with correct parameters', () => {
				(encryptStub.calledWithExactly(multilineMessage, secret, recipient))
					.should.be.true();
			});

			it('should print the result', () => {
				(printResultStub.calledWithExactly(vorpal, { passphrase: 'stdin', message: 'stdin' }))
					.should.be.true();
				(printSpy.calledWithExactly(cryptoEncryptReturnObject)).should.be.true();
			});
		});
	});
});
