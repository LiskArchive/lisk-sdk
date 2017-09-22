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
import decryptPassphraseCommand from '../../src/commands/decryptPassphrase';
import cryptoModule from '../../src/utils/cryptoModule';
import * as input from '../../src/utils/input';
import * as print from '../../src/utils/print';
import {
	getCommands,
	getRequiredArgs,
	setUpVorpalWithCommand,
} from './utils';

describe('decrypt passphrase command', () => {
	const command = 'decrypt passphrase';
	let vorpal;

	beforeEach(() => {
		vorpal = setUpVorpalWithCommand(decryptPassphraseCommand);
	});

	afterEach(() => {
		vorpal.ui.removeAllListeners();
	});

	describe('setup', () => {
		it('should be available', () => {
			const encryptPassphraseCommands = getCommands(vorpal, command);
			(encryptPassphraseCommands).should.have.length(1);
		});

		it('should require 1 inputs', () => {
			const requiredArgs = getRequiredArgs(vorpal, command);
			(requiredArgs).should.have.length(1);
		});
	});

	describe('when executed', () => {
		const iv = '0123';
		const cipher = 'abcd';
		const commandWithIv = `${command} ${iv}`;
		const commandWithIvAndPassphrase = `${commandWithIv} ${cipher}`;
		const multilineData = `${cipher}\nSome irrelevant input\non new lines`;
		const password = 'testing123';
		const passphrase = 'secret passphrase';
		const passwordDisplayName = 'your password';
		const stdIn = 'stdin';
		const defaultErrorMessage = 'Some error message.';
		const wrappedErrorMessage = `Could not decrypt passphrase: ${defaultErrorMessage}`;

		let cipherAndIv;
		let stdInResult;
		let getStdInStub;
		let getPassphraseStub;
		let getDataStub;
		let cryptoDecryptPassphraseReturnObject;
		let decryptPassphraseStub;
		let printSpy;
		let printResultStub;

		beforeEach(() => {
			cipherAndIv = {
				cipher,
				iv,
			};
			getStdInStub = sinon.stub(input, 'getStdIn').resolves({});
			getPassphraseStub = sinon.stub(input, 'getPassphrase').resolves(password);
			getDataStub = sinon.stub(input, 'getData').resolves(cipher);
			cryptoDecryptPassphraseReturnObject = { passphrase };
			decryptPassphraseStub = sinon.stub(cryptoModule, 'decryptPassphrase').returns(cryptoDecryptPassphraseReturnObject);
			printSpy = sinon.spy();
			printResultStub = sinon.stub(print, 'printResult').returns(printSpy);
		});

		afterEach(() => {
			getStdInStub.restore();
			getPassphraseStub.restore();
			getDataStub.restore();
			decryptPassphraseStub.restore();
			printResultStub.restore();
		});

		describe('if no passphrase source has been provided', () => {
			beforeEach(() => {
				return vorpal.exec(commandWithIv);
			});

			it('should inform the user that the decryption was not successful', () => {
				(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
				(printSpy.calledWithExactly({ error: 'Could not decrypt passphrase: No passphrase was provided.' })).should.be.true();
			});
		});

		describe('if the stdin cannot be retrieved', () => {
			beforeEach(() => {
				getStdInStub.rejects(new Error(defaultErrorMessage));
				return vorpal.exec(commandWithIvAndPassphrase);
			});

			it('should inform the user the decryption was not successful', () => {
				(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
				(printSpy.calledWithExactly({ error: wrappedErrorMessage })).should.be.true();
			});
		});

		describe('if an error occurs during decryption', () => {
			beforeEach(() => {
				decryptPassphraseStub.rejects(new Error(defaultErrorMessage));
				return vorpal.exec(commandWithIvAndPassphrase);
			});

			it('should inform the user the decryption was not successful', () => {
				(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
				(printSpy.calledWithExactly({ error: wrappedErrorMessage })).should.be.true();
			});
		});

		describe('encrypted passphrase', () => {
			describe('if the passphrase cannot be retrieved', () => {
				beforeEach(() => {
					getDataStub.rejects(new Error(defaultErrorMessage));
					return vorpal.exec(commandWithIvAndPassphrase);
				});

				it('should inform the user the encryption was not successful', () => {
					(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
					(printSpy.calledWithExactly({ error: wrappedErrorMessage })).should.be.true();
				});
			});

			describe('with encrypted passphrase passed as a command line argument', () => {
				beforeEach(() => {
					return vorpal.exec(commandWithIvAndPassphrase);
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
						vorpal, undefined, undefined, { displayName: passwordDisplayName },
					))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(cipher, undefined, null))
						.should.be.true();
				});

				it('should call the crypto module decrypt method with correct parameters', () => {
					(decryptPassphraseStub.calledWithExactly(cipherAndIv, password))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, {}))
						.should.be.true();
					(printSpy.calledWithExactly({ passphrase })).should.be.true();
				});
			});

			describe('with encrypted passphrase passed via file path', () => {
				const passphraseSource = 'file:/path/to/passphrase.txt';
				const passphraseFileCommand = `${commandWithIv} --passphrase ${passphraseSource}`;

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

				it('should call the input util getPassphrase with the correct parameters', () => {
					(getPassphraseStub.calledWithExactly(
						vorpal, undefined, undefined, { displayName: passwordDisplayName },
					))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(undefined, passphraseSource, null))
						.should.be.true();
				});

				it('should call the crypto module decrypt method with correct parameters', () => {
					(decryptPassphraseStub.calledWithExactly(cipherAndIv, password))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: passphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly({ passphrase })).should.be.true();
				});
			});

			describe('with encrypted passphrase passed via stdin', () => {
				const passphraseSource = stdIn;
				const dataStdInCommand = `${commandWithIv} --passphrase ${passphraseSource}`;

				beforeEach(() => {
					stdInResult = { data: multilineData };
					getStdInStub.resolves(stdInResult);
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
						vorpal, undefined, undefined, { displayName: passwordDisplayName },
					))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(undefined, passphraseSource, cipher))
						.should.be.true();
				});

				it('should call the crypto module decrypt method with correct parameters', () => {
					(decryptPassphraseStub.calledWithExactly(cipherAndIv, password))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: passphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly({ passphrase })).should.be.true();
				});
			});
		});

		describe('password', () => {
			describe('if the password cannot be retrieved', () => {
				beforeEach(() => {
					getPassphraseStub.rejects(new Error(defaultErrorMessage));
					return vorpal.exec(commandWithIvAndPassphrase);
				});

				it('should inform the user the decryption was not successful', () => {
					(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
					(printSpy.calledWithExactly({ error: wrappedErrorMessage })).should.be.true();
				});
			});

			describe('with password passed via prompt', () => {
				beforeEach(() => {
					return vorpal.exec(commandWithIvAndPassphrase);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: false,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the password', () => {
					(getPassphraseStub.calledWithExactly(
						vorpal, undefined, undefined, { displayName: passwordDisplayName },
					))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(cipher, undefined, null))
						.should.be.true();
				});

				it('should call the crypto module decryptPassphrase method with correct parameters', () => {
					(decryptPassphraseStub.calledWithExactly(cipherAndIv, password))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
					(printSpy.calledWithExactly(cryptoDecryptPassphraseReturnObject)).should.be.true();
				});
			});

			describe('with plaintext password passed via command line', () => {
				const passwordSource = `pass:${password}`;
				const commandWithPlaintextPassword = `${commandWithIvAndPassphrase} --password "${passwordSource}"`;

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

				it('should call the input util getPassphrase with the correct parameters for the password', () => {
					(getPassphraseStub.calledWithExactly(
						vorpal, passwordSource, undefined, { displayName: passwordDisplayName },
					))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(cipher, undefined, null))
						.should.be.true();
				});

				it('should call the crypto module decryptPassphrase method with correct parameters', () => {
					(decryptPassphraseStub.calledWithExactly(cipherAndIv, password))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { password: passwordSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoDecryptPassphraseReturnObject)).should.be.true();
				});
			});

			describe('with password passed via environmental variable', () => {
				const envVariable = 'TEST_PASSWORD';
				const passwordSource = `env:${envVariable}`;
				const commandWithEnvPassword = `${commandWithIvAndPassphrase} --password "${passwordSource}"`;

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

				it('should call the input util getPassphrase with the correct parameters for the password', () => {
					(getPassphraseStub.calledWithExactly(
						vorpal, passwordSource, undefined, { displayName: passwordDisplayName },
					))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(cipher, undefined, null))
						.should.be.true();
				});

				it('should call the crypto module decryptPassphrase method with correct parameters', () => {
					(decryptPassphraseStub.calledWithExactly(cipherAndIv, password))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { password: passwordSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoDecryptPassphraseReturnObject)).should.be.true();
				});
			});

			describe('with password passed via file path', () => {
				const passwordSource = 'file:/path/to/password.txt';
				const commandWithFilePassword = `${commandWithIvAndPassphrase} --password "${passwordSource}"`;

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

				it('should call the input util getPassphrase with the correct parameters for the password', () => {
					(getPassphraseStub.calledWithExactly(
						vorpal, passwordSource, undefined, { displayName: passwordDisplayName },
					))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(cipher, undefined, null))
						.should.be.true();
				});

				it('should call the crypto module decryptPassphrase method with correct parameters', () => {
					(decryptPassphraseStub.calledWithExactly(cipherAndIv, password))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { password: passwordSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoDecryptPassphraseReturnObject)).should.be.true();
				});
			});

			describe('with password passed via stdin', () => {
				const passwordSource = stdIn;
				const commandWithStdInPassword = `${commandWithIvAndPassphrase} --password "${passwordSource}"`;

				beforeEach(() => {
					stdInResult = { passphrase: password };
					getStdInStub.resolves(stdInResult);
					return vorpal.exec(commandWithStdInPassword);
				});

				it('should call the input util getStdIn with the correct parameters', () => {
					(getStdInStub.calledWithExactly({
						passphraseIsRequired: true,
						dataIsRequired: false,
					}))
						.should.be.true();
				});

				it('should call the input util getPassphrase with the correct parameters for the password', () => {
					(getPassphraseStub.calledWithExactly(
						vorpal, passwordSource, password, { displayName: passwordDisplayName },
					))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(cipher, undefined, null))
						.should.be.true();
				});

				it('should call the crypto module decryptPassphrase method with correct parameters', () => {
					(decryptPassphraseStub.calledWithExactly(cipherAndIv, password))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { password: passwordSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoDecryptPassphraseReturnObject)).should.be.true();
				});
			});
		});

		describe('with encrypted passphrase and password passed via stdin', () => {
			const passwordAndPassphraseStdInCommand = `${commandWithIv} --password ${stdIn} --passphrase ${stdIn}`;

			beforeEach(() => {
				stdInResult = { passphrase: password, data: multilineData };
				getStdInStub.resolves(stdInResult);
				getDataStub.resolves(cipher);
				return vorpal.exec(passwordAndPassphraseStdInCommand);
			});

			it('should call the input util getStdIn with the correct parameters', () => {
				(getStdInStub.calledWithExactly({
					passphraseIsRequired: true,
					dataIsRequired: true,
				}))
					.should.be.true();
			});

			it('should call the input util getPassphrase with the correct parameters for the password', () => {
				(getPassphraseStub.calledWithExactly(
					vorpal, stdIn, password, { displayName: passwordDisplayName },
				))
					.should.be.true();
			});

			it('should call the input util getData with the correct parameters', () => {
				(getDataStub.calledWithExactly(undefined, stdIn, cipher))
					.should.be.true();
			});

			it('should call the crypto module decryptPassphrase method with correct parameters', () => {
				(decryptPassphraseStub.calledWithExactly(cipherAndIv, password))
					.should.be.true();
			});

			it('should print the result', () => {
				(printResultStub.calledWithExactly(vorpal, { password: stdIn, passphrase: stdIn }))
					.should.be.true();
				(printSpy.calledWithExactly(cryptoDecryptPassphraseReturnObject)).should.be.true();
			});
		});
	});
});
