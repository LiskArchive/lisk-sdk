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
import encryptPassphraseCommand from '../../src/commands/encryptPassphrase';
import cryptoModule from '../../src/utils/cryptoModule';
import * as input from '../../src/utils/input';
import * as print from '../../src/utils/print';
import {
	getCommands,
	getRequiredArgs,
	setUpVorpalWithCommand,
} from './utils';

describe('encrypt passphrase command', () => {
	const command = 'encrypt passphrase';
	let vorpal;

	beforeEach(() => {
		vorpal = setUpVorpalWithCommand(encryptPassphraseCommand);
	});

	afterEach(() => {
		vorpal.ui.removeAllListeners();
	});

	describe('setup', () => {
		it('should be available', () => {
			const encryptPassphraseCommands = getCommands(vorpal, command);
			(encryptPassphraseCommands).should.have.length(1);
		});

		it('should require 0 inputs', () => {
			const requiredArgs = getRequiredArgs(vorpal, command);
			(requiredArgs).should.have.length(0);
		});
	});

	describe('when executed', () => {
		const passphrase = 'secret passphrase';
		const password = 'testing123';
		const passwordDisplayName = 'your password';
		const stdIn = 'stdin';
		const defaultErrorMessage = 'Some error message.';
		const wrappedErrorMessage = `Could not encrypt passphrase: ${defaultErrorMessage}`;

		let cryptoEncryptPassphraseReturnObject;
		let stdInResult;
		let getStdInStub;
		let getPassphraseStub;
		let encryptPassphraseStub;
		let printSpy;
		let printResultStub;

		beforeEach(() => {
			cryptoEncryptPassphraseReturnObject = {
				cipher: 'abcd',
				iv: '0123',
			};
			getStdInStub = sinon.stub(input, 'getStdIn').resolves({});
			getPassphraseStub = sinon.stub(input, 'getPassphrase');
			getPassphraseStub.onFirstCall().resolves(passphrase);
			getPassphraseStub.onSecondCall().resolves(password);
			encryptPassphraseStub = sinon.stub(cryptoModule, 'encryptPassphrase').returns(cryptoEncryptPassphraseReturnObject);
			printSpy = sinon.spy();
			printResultStub = sinon.stub(print, 'printResult').returns(printSpy);
		});

		afterEach(() => {
			getStdInStub.restore();
			getPassphraseStub.restore();
			encryptPassphraseStub.restore();
			printResultStub.restore();
		});

		describe('if the stdin cannot be retrieved', () => {
			beforeEach(() => {
				getStdInStub.rejects(new Error(defaultErrorMessage));
				return vorpal.exec(command);
			});

			it('should inform the user the encryption was not successful', () => {
				(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
				(printSpy.calledWithExactly({ error: wrappedErrorMessage })).should.be.true();
			});
		});

		describe('if an error occurs during encryption', () => {
			beforeEach(() => {
				encryptPassphraseStub.rejects(new Error(defaultErrorMessage));
				return vorpal.exec(command);
			});

			it('should inform the user the encryption was not successful', () => {
				(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
				(printSpy.calledWithExactly({ error: wrappedErrorMessage })).should.be.true();
			});
		});

		describe('passphrase', () => {
			describe('if the passphrase cannot be retrieved', () => {
				beforeEach(() => {
					getPassphraseStub.onFirstCall().rejects(new Error(defaultErrorMessage));
					return vorpal.exec(command);
				});

				it('should inform the user the encryption was not successful', () => {
					(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
					(printSpy.calledWithExactly({ error: wrappedErrorMessage })).should.be.true();
				});
			});

			describe('with passphrase passed via prompt', () => {
				beforeEach(() => {
					return vorpal.exec(command);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the passphrase', () => {
					(getPassphraseStub.firstCall.calledWithExactly(
						vorpal, undefined, undefined, { shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the password', () => {
					(getPassphraseStub.secondCall.calledWithExactly(
						vorpal, undefined, null, { displayName: passwordDisplayName, shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the crypto module encryptPassphrase method with correct parameters', () => {
					(encryptPassphraseStub.calledWithExactly(passphrase, password))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptPassphraseReturnObject)).should.be.true();
				});
			});

			describe('with plaintext passphrase passed via command line', () => {
				const passphraseSource = `pass:${passphrase}`;
				const commandWithPlaintextPassphrase = `${command} --passphrase "${passphraseSource}"`;

				beforeEach(() => {
					return vorpal.exec(commandWithPlaintextPassphrase);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the passphrase', () => {
					(getPassphraseStub.firstCall.calledWithExactly(
						vorpal, passphraseSource, undefined, { shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the password', () => {
					(getPassphraseStub.secondCall.calledWithExactly(
						vorpal, undefined, null, { displayName: passwordDisplayName, shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the crypto module encryptPassphrase method with correct parameters', () => {
					(encryptPassphraseStub.calledWithExactly(passphrase, password))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: passphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptPassphraseReturnObject)).should.be.true();
				});
			});

			describe('with passphrase passed via environmental variable', () => {
				const envVariable = 'TEST_PASSPHRASE';
				const passphraseSource = `env:${envVariable}`;
				const commandWithEnvPassphrase = `${command} --passphrase "${passphraseSource}"`;

				beforeEach(() => {
					return vorpal.exec(commandWithEnvPassphrase);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the passphrase', () => {
					(getPassphraseStub.firstCall.calledWithExactly(
						vorpal, passphraseSource, undefined, { shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the password', () => {
					(getPassphraseStub.secondCall.calledWithExactly(
						vorpal, undefined, null, { displayName: passwordDisplayName, shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the crypto module encryptPassphrase method with correct parameters', () => {
					(encryptPassphraseStub.calledWithExactly(passphrase, password))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: passphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptPassphraseReturnObject)).should.be.true();
				});
			});

			describe('with passphrase passed via file path', () => {
				const passphraseSource = 'file:/path/to/passphrase.txt';
				const commandWithFilePassphrase = `${command} --passphrase "${passphraseSource}"`;

				beforeEach(() => {
					return vorpal.exec(commandWithFilePassphrase);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the passphrase', () => {
					(getPassphraseStub.firstCall.calledWithExactly(
						vorpal, passphraseSource, undefined, { shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the password', () => {
					(getPassphraseStub.secondCall.calledWithExactly(
						vorpal, undefined, null, { displayName: passwordDisplayName, shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the crypto module encryptPassphrase method with correct parameters', () => {
					(encryptPassphraseStub.calledWithExactly(passphrase, password))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: passphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptPassphraseReturnObject)).should.be.true();
				});
			});

			describe('with passphrase passed via stdin', () => {
				const passphraseSource = stdIn;
				const commandWithStdInPassphrase = `${command} --passphrase "${passphraseSource}"`;

				beforeEach(() => {
					stdInResult = { passphrase };
					getStdInStub.resolves(stdInResult);
					return vorpal.exec(commandWithStdInPassphrase);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: true,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the passphrase', () => {
					(getPassphraseStub.firstCall.calledWithExactly(
						vorpal, passphraseSource, passphrase, { shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the password', () => {
					(getPassphraseStub.secondCall.calledWithExactly(
						vorpal, undefined, null, { displayName: passwordDisplayName, shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the crypto module encryptPassphrase method with correct parameters', () => {
					(encryptPassphraseStub.calledWithExactly(passphrase, password))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: passphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptPassphraseReturnObject)).should.be.true();
				});
			});
		});

		describe('password', () => {
			describe('if the password cannot be retrieved', () => {
				beforeEach(() => {
					getPassphraseStub.onSecondCall().rejects(new Error(defaultErrorMessage));
					return vorpal.exec(command);
				});

				it('should inform the user the encryption was not successful', () => {
					(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
					(printSpy.calledWithExactly({ error: wrappedErrorMessage })).should.be.true();
				});
			});

			describe('with password passed via prompt', () => {
				beforeEach(() => {
					return vorpal.exec(command);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the passphrase', () => {
					(getPassphraseStub.firstCall.calledWithExactly(
						vorpal, undefined, undefined, { shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the password', () => {
					(getPassphraseStub.secondCall.calledWithExactly(
						vorpal, undefined, null, { displayName: passwordDisplayName, shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the crypto module encryptPassphrase method with correct parameters', () => {
					(encryptPassphraseStub.calledWithExactly(passphrase, password))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptPassphraseReturnObject)).should.be.true();
				});
			});

			describe('with plaintext password passed via command line', () => {
				const passwordSource = `pass:${password}`;
				const commandWithPlaintextPassword = `${command} --password "${passwordSource}"`;

				beforeEach(() => {
					return vorpal.exec(commandWithPlaintextPassword);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the passphrase', () => {
					(getPassphraseStub.firstCall.calledWithExactly(
						vorpal, undefined, undefined, { shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the password', () => {
					(getPassphraseStub.secondCall.calledWithExactly(
						vorpal, passwordSource, null, { displayName: passwordDisplayName, shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the crypto module encryptPassphrase method with correct parameters', () => {
					(encryptPassphraseStub.calledWithExactly(passphrase, password))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { password: passwordSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptPassphraseReturnObject)).should.be.true();
				});
			});

			describe('with password passed via environmental variable', () => {
				const envVariable = 'TEST_PASSWORD';
				const passwordSource = `env:${envVariable}`;
				const commandWithEnvPassword = `${command} --password "${passwordSource}"`;

				beforeEach(() => {
					return vorpal.exec(commandWithEnvPassword);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the passphrase', () => {
					(getPassphraseStub.firstCall.calledWithExactly(
						vorpal, undefined, undefined, { shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the password', () => {
					(getPassphraseStub.secondCall.calledWithExactly(
						vorpal, passwordSource, null, { displayName: passwordDisplayName, shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the crypto module encryptPassphrase method with correct parameters', () => {
					(encryptPassphraseStub.calledWithExactly(passphrase, password))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { password: passwordSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptPassphraseReturnObject)).should.be.true();
				});
			});

			describe('with password passed via file path', () => {
				const passwordSource = 'file:/path/to/password.txt';
				const commandWithFilePassword = `${command} --password "${passwordSource}"`;

				beforeEach(() => {
					return vorpal.exec(commandWithFilePassword);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the passphrase', () => {
					(getPassphraseStub.firstCall.calledWithExactly(
						vorpal, undefined, undefined, { shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the password', () => {
					(getPassphraseStub.secondCall.calledWithExactly(
						vorpal, passwordSource, null, { displayName: passwordDisplayName, shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the crypto module encryptPassphrase method with correct parameters', () => {
					(encryptPassphraseStub.calledWithExactly(passphrase, password))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { password: passwordSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptPassphraseReturnObject)).should.be.true();
				});
			});

			describe('with password passed via stdin', () => {
				const passwordSource = stdIn;
				const commandWithStdInPassword = `${command} --password "${passwordSource}"`;

				beforeEach(() => {
					stdInResult = { data: `${password}\nSome irrelevant data` };
					getStdInStub.resolves(stdInResult);
					return vorpal.exec(commandWithStdInPassword);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: true,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the passphrase', () => {
					(getPassphraseStub.firstCall.calledWithExactly(
						vorpal, undefined, undefined, { shouldRepeat: true },
					))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the password', () => {
					(getPassphraseStub.secondCall.calledWithExactly(
						vorpal, passwordSource, password, {
							displayName: passwordDisplayName,
							shouldRepeat: true,
						},
					))
						.should.be.true();
				});

				it('should call the crypto module encryptPassphrase method with correct parameters', () => {
					(encryptPassphraseStub.calledWithExactly(passphrase, password))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { password: passwordSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoEncryptPassphraseReturnObject)).should.be.true();
				});
			});
		});

		describe('with passphrase and password passed via stdin', () => {
			const commandWithStdInPassphraseAndStdInPassword = `${command} --passphrase ${stdIn} --password ${stdIn}`;

			beforeEach(() => {
				stdInResult = { passphrase, data: `${password}\nSome irrelevant data` };
				getStdInStub.resolves(stdInResult);
				return vorpal.exec(commandWithStdInPassphraseAndStdInPassword);
			});

			it('should call the input util getStdIn with the correct parameters', () => {
				(getStdInStub.calledWithExactly({
					passphraseIsRequired: true,
					dataIsRequired: true,
				}))
					.should.be.true();
			});

			it('should call the input util getPassphrase with the correct parameters for the passphrase', () => {
				(getPassphraseStub.firstCall.calledWithExactly(
					vorpal, stdIn, passphrase, { shouldRepeat: true },
				))
					.should.be.true();
			});

			it('should call the input util getPassphrase with the correct parameters for the password', () => {
				(getPassphraseStub.secondCall.calledWithExactly(
					vorpal, stdIn, password, { displayName: passwordDisplayName, shouldRepeat: true },
				))
					.should.be.true();
			});

			it('should call the crypto module encryptPassphrase method with correct parameters', () => {
				(encryptPassphraseStub.calledWithExactly(passphrase, password))
					.should.be.true();
			});

			it('should print the result', () => {
				(printResultStub.calledWithExactly(vorpal, { passphrase: stdIn, password: stdIn }))
					.should.be.true();
				(printSpy.calledWithExactly(cryptoEncryptPassphraseReturnObject)).should.be.true();
			});
		});
	});
});
