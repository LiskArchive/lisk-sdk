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
import encryptMessageCommand from '../../src/commands/encryptMessage';
import cryptoModule from '../../src/utils/cryptoModule';
import * as input from '../../src/utils/input';
import * as print from '../../src/utils/print';
import {
	getCommands,
	getRequiredArgs,
	setUpVorpalWithCommand,
} from './utils';

describe('encrypt message command', () => {
	const command = 'encrypt message';
	let vorpal;

	beforeEach(() => {
		vorpal = setUpVorpalWithCommand(encryptMessageCommand);
	});

	afterEach(() => {
		vorpal.ui.removeAllListeners();
	});

	describe('setup', () => {
		it('should be available', () => {
			const encryptCommands = getCommands(vorpal, command);
			(encryptCommands).should.have.length(1);
		});

		it('should require 1 input', () => {
			const requiredArgs = getRequiredArgs(vorpal, command);
			(requiredArgs).should.have.length(1);
		});
	});

	describe('when executed', () => {
		const data = 'Some important message';
		const multilineData = 'Some important message\nthat spans\nmultiple lines\n';
		const passphrase = 'pass phrase';
		const recipient = 'bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0';
		const defaultPassphraseSource = `pass:${passphrase}`;
		const commandWithRecipient = `${command} ${recipient}`;
		const commandWithMessage = `${commandWithRecipient} "${data}"`;
		const commandWithPassphrase = `${commandWithRecipient} --passphrase "${defaultPassphraseSource}"`;

		const nonce = '60ee6cbb5f9f0ee3736a6ffd20317f59ebfee2083e819909';
		const encryptedMessage = '4ba04a1c568b66fe5f6e670295cd9945730013f4e3feb5ac0b4e3c';
		const cryptoEncryptReturnObject = {
			nonce,
			encryptedMessage,
		};
		const defaultErrorMessage = 'Some error message.';
		const wrappedErrorMessage = `Could not encrypt message: ${defaultErrorMessage}`;

		let stdInResult;
		let getStdInStub;
		let getPassphraseStub;
		let getDataStub;
		let encryptStub;
		let printSpy;
		let printResultStub;

		beforeEach(() => {
			getStdInStub = sandbox.stub(input, 'getStdIn').resolves({});
			getPassphraseStub = sandbox.stub(input, 'getPassphrase').resolves(passphrase);
			getDataStub = sandbox.stub(input, 'getData').resolves(data);
			encryptStub = sandbox.stub(cryptoModule, 'encryptMessage').returns(cryptoEncryptReturnObject);
			printSpy = sandbox.spy();
			printResultStub = sandbox.stub(print, 'printResult').returns(printSpy);
		});

		describe('if no message source has been provided', () => {
			beforeEach(() => {
				return vorpal.exec(commandWithRecipient);
			});

			it('should inform the user that the encryption was not successful', () => {
				(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
				(printSpy.calledWithExactly({ error: 'Could not encrypt message: No message was provided.' })).should.be.true();
			});
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
					(getPassphraseStub.calledWithExactly(
						vorpal, undefined, undefined, { shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(data, undefined, undefined))
						.should.be.true();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					(encryptStub.calledWithExactly(data, passphrase, recipient))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptReturnObject)).should.be.true();
				});
			});

			describe('with plaintext passphrase passed via command line', () => {
				const passphraseSource = `pass:${passphrase}`;
				const passphrasePlainTextCommand = `${commandWithMessage} --passphrase "${passphraseSource}"`;

				beforeEach(() => {
					return vorpal.exec(passphrasePlainTextCommand);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase method with correct parameters', () => {
					(getPassphraseStub.calledWithExactly(
						vorpal, passphraseSource, undefined, { shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(data, undefined, undefined))
						.should.be.true();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					(encryptStub.calledWithExactly(data, passphrase, recipient)).should.be.true();
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
				const passphraseEnvCommand = `${commandWithMessage} --passphrase ${passphraseSource}`;

				beforeEach(() => {
					return vorpal.exec(passphraseEnvCommand);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with correct parameters', () => {
					(getPassphraseStub.calledWithExactly(
						vorpal, passphraseSource, undefined, { shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(data, undefined, undefined))
						.should.be.true();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					(encryptStub.calledWithExactly(data, passphrase, recipient)).should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: passphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptReturnObject)).should.be.true();
				});
			});

			describe('with passphrase passed via file path', () => {
				const passphraseSource = 'file:/path/to/passphrase.txt';
				const passphraseFileCommand = `${commandWithMessage} --passphrase ${passphraseSource}`;

				beforeEach(() => {
					return vorpal.exec(passphraseFileCommand);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase method with correct parameters', () => {
					(getPassphraseStub.calledWithExactly(
						vorpal, passphraseSource, undefined, { shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(data, undefined, undefined))
						.should.be.true();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					(encryptStub.calledWithExactly(data, passphrase, recipient))
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
				const passphraseStdInCommand = `${commandWithMessage} --passphrase ${passphraseSource}`;

				beforeEach(() => {
					stdInResult = { passphrase };
					getStdInStub.resolves(stdInResult);
					return vorpal.exec(passphraseStdInCommand);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: true,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters', () => {
					(getPassphraseStub.calledWithExactly(
						vorpal, passphraseSource, passphrase, { shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(data, undefined, undefined))
						.should.be.true();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					(encryptStub.calledWithExactly(data, passphrase, recipient))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: passphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptReturnObject)).should.be.true();
				});
			});
		});

		describe('data', () => {
			describe('if the data cannot be retrieved', () => {
				beforeEach(() => {
					getDataStub.rejects(new Error(defaultErrorMessage));
					return vorpal.exec(commandWithMessage);
				});

				it('should inform the user the encryption was not successful', () => {
					(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
					(printSpy.calledWithExactly({ error: wrappedErrorMessage })).should.be.true();
				});
			});

			describe('with data passed as a command line argument', () => {
				const dataPlainTextCommand = `${commandWithPassphrase} "${data}"`;

				beforeEach(() => {
					getDataStub.resolves(data);
					return vorpal.exec(dataPlainTextCommand);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters', () => {
					(getPassphraseStub.calledWithExactly(
						vorpal, defaultPassphraseSource, undefined, { shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(data, undefined, undefined))
						.should.be.true();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					(encryptStub.calledWithExactly(data, passphrase, recipient))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: defaultPassphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptReturnObject)).should.be.true();
				});
			});

			describe('with data passed via file path', () => {
				const dataFileCommand = `${commandWithPassphrase} --message file:/path/to/message.txt`;

				beforeEach(() => {
					getDataStub.resolves(multilineData);
					return vorpal.exec(dataFileCommand);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters', () => {
					(getPassphraseStub.calledWithExactly(
						vorpal, defaultPassphraseSource, undefined, { shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(undefined, 'file:/path/to/message.txt', undefined))
						.should.be.true();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					(encryptStub.calledWithExactly(multilineData, passphrase, recipient))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: defaultPassphraseSource, message: 'file:/path/to/message.txt' }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptReturnObject)).should.be.true();
				});
			});

			describe('with data passed via stdin', () => {
				const dataStdInCommand = `${commandWithPassphrase} --message stdin`;

				beforeEach(() => {
					stdInResult = { data: multilineData };
					getStdInStub.resolves(stdInResult);
					getDataStub.resolves(multilineData);
					return vorpal.exec(dataStdInCommand);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: true,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters', () => {
					(getPassphraseStub.calledWithExactly(
						vorpal, defaultPassphraseSource, undefined, { shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(undefined, 'stdin', multilineData))
						.should.be.true();
				});

				it('should call the crypto module encrypt method with correct parameters', () => {
					(encryptStub.calledWithExactly(multilineData, passphrase, recipient))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: defaultPassphraseSource, message: 'stdin' }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptReturnObject)).should.be.true();
				});
			});
		});

		describe('with passphrase and data passed via stdin', () => {
			const passphraseAndDataStdInCommand = `${command} ${recipient} --message stdin --passphrase stdin`;

			beforeEach(() => {
				stdInResult = { passphrase, data: multilineData };
				getStdInStub.resolves(stdInResult);
				getDataStub.resolves(multilineData);
				return vorpal.exec(passphraseAndDataStdInCommand);
			});

			it('should call the input util getStdIn with the correct parameters', () => {
				(getStdInStub.calledWithExactly({
					passphraseIsRequired: true,
					dataIsRequired: true,
				}))
					.should.be.true();
			});

			it('should call the input util getPassphrase with the correct parameters', () => {
				(getPassphraseStub.calledWithExactly(vorpal, 'stdin', passphrase, { shouldRepeat: true }))
					.should.be.true();
			});

			it('should call the input util getData with the correct parameters', () => {
				(getDataStub.calledWithExactly(undefined, 'stdin', multilineData))
					.should.be.true();
			});

			it('should call the crypto module encrypt method with correct parameters', () => {
				(encryptStub.calledWithExactly(multilineData, passphrase, recipient))
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
