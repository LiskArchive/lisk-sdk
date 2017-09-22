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
import decryptMessageCommand from '../../src/commands/decryptMessage';
import cryptoModule from '../../src/utils/cryptoModule';
import * as input from '../../src/utils/input';
import * as print from '../../src/utils/print';
import {
	getCommands,
	getRequiredArgs,
	setUpVorpalWithCommand,
} from './utils';

describe('decrypt message command', () => {
	const command = 'decrypt message';
	let vorpal;

	beforeEach(() => {
		vorpal = setUpVorpalWithCommand(decryptMessageCommand);
	});

	afterEach(() => {
		vorpal.ui.removeAllListeners();
	});

	describe('setup', () => {
		it('should be available', () => {
			const decryptCommands = getCommands(vorpal, command);
			(decryptCommands).should.have.length(1);
		});

		it('should require 2 inputs', () => {
			const requiredArgs = getRequiredArgs(vorpal, command);
			(requiredArgs).should.have.length(2);
		});
	});

	describe('when executed', () => {
		const data = 'Hello Lisker';
		const encryptedData = '4728715ed4463a37d8e90720a27377f04a84911b95520c2582a8b6da';
		const nonce = '682be05eeb73a794163b5584cac6b33769c2abd867459cae';
		const secret = 'recipient secret';
		// sender secret: 'sender secret'
		const senderPublicKey = '38433137692948be1c05bbae686c9c850d3c8d9c52c1aebb4a7c1d5dd6d010d7';
		const defaultPassphraseSource = `pass:${secret}`;
		const commandWithSenderAndNonce = `${command} ${senderPublicKey} ${nonce}`;
		const commandWithMessage = `${commandWithSenderAndNonce} ${encryptedData}`;
		const commandWithPassphrase = `${commandWithSenderAndNonce} --passphrase "${defaultPassphraseSource}"`;
		const cryptoDecryptReturnObject = { data };

		const defaultErrorMessage = 'Some error message.';
		const wrappedErrorMessage = `Could not decrypt message: ${defaultErrorMessage}`;

		let stdInResult;
		let getStdInStub;
		let getPassphraseStub;
		let getDataStub;
		let decryptStub;
		let printSpy;
		let printResultStub;

		beforeEach(() => {
			getStdInStub = sinon.stub(input, 'getStdIn').resolves({});
			getPassphraseStub = sinon.stub(input, 'getPassphrase').resolves(secret);
			getDataStub = sinon.stub(input, 'getData').resolves(encryptedData);
			decryptStub = sinon.stub(cryptoModule, 'decryptMessage').returns(cryptoDecryptReturnObject);
			printSpy = sinon.spy();
			printResultStub = sinon.stub(print, 'printResult').returns(printSpy);
		});

		afterEach(() => {
			getStdInStub.restore();
			getPassphraseStub.restore();
			getDataStub.restore();
			decryptStub.restore();
			printResultStub.restore();
		});

		describe('if no message source has been provided', () => {
			beforeEach(() => {
				return vorpal.exec(commandWithSenderAndNonce);
			});

			it('should inform the user that the decryption was not successful', () => {
				(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
				(printSpy.calledWithExactly({ error: 'Could not decrypt message: No message was provided.' })).should.be.true();
			});
		});

		describe('if the stdin cannot be retrieved', () => {
			beforeEach(() => {
				getStdInStub.rejects(new Error(defaultErrorMessage));
				return vorpal.exec(commandWithMessage);
			});

			it('should inform the user the decryption was not successful', () => {
				(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
				(printSpy.calledWithExactly({ error: wrappedErrorMessage })).should.be.true();
			});
		});

		describe('if an error occurs during decryption', () => {
			beforeEach(() => {
				decryptStub.rejects(new Error(defaultErrorMessage));
				return vorpal.exec(commandWithMessage);
			});

			it('should inform the user the decryption was not successful', () => {
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

				it('should inform the user the decryption was not successful', () => {
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
					(getPassphraseStub.calledWithExactly(vorpal, undefined, undefined))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(encryptedData, undefined, undefined))
						.should.be.true();
				});

				it('should call the crypto module decrypt method with correct parameters', () => {
					(decryptStub.calledWithExactly(encryptedData, nonce, secret, senderPublicKey))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
					(printSpy.calledWithExactly(cryptoDecryptReturnObject)).should.be.true();
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
					(getPassphraseStub.calledWithExactly(vorpal, passphraseSource, undefined))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(encryptedData, undefined, undefined))
						.should.be.true();
				});

				it('should call the crypto module decrypt method with correct parameters', () => {
					(decryptStub.calledWithExactly(encryptedData, nonce, secret, senderPublicKey))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: passphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoDecryptReturnObject)).should.be.true();
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
					(getPassphraseStub.calledWithExactly(vorpal, passphraseSource, undefined))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(encryptedData, undefined, undefined))
						.should.be.true();
				});

				it('should call the crypto module decrypt method with correct parameters', () => {
					(decryptStub.calledWithExactly(encryptedData, nonce, secret, senderPublicKey))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: passphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoDecryptReturnObject)).should.be.true();
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
					(getPassphraseStub.calledWithExactly(vorpal, passphraseSource, undefined))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(encryptedData, undefined, undefined))
						.should.be.true();
				});

				it('should call the crypto module decrypt method with correct parameters', () => {
					(decryptStub.calledWithExactly(encryptedData, nonce, secret, senderPublicKey))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: passphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoDecryptReturnObject)).should.be.true();
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
					(getPassphraseStub.calledWithExactly(vorpal, passphraseSource, secret))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(encryptedData, undefined, undefined))
						.should.be.true();
				});

				it('should call the crypto module decrypt method with correct parameters', () => {
					(decryptStub.calledWithExactly(encryptedData, nonce, secret, senderPublicKey))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: passphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoDecryptReturnObject)).should.be.true();
				});
			});
		});

		describe('encrypted data', () => {
			describe('if the data cannot be retrieved', () => {
				beforeEach(() => {
					getDataStub.rejects(new Error(defaultErrorMessage));
					return vorpal.exec(commandWithMessage);
				});

				it('should inform the user the decryption was not successful', () => {
					(printResultStub.calledWithExactly(vorpal, {})).should.be.true();
					(printSpy.calledWithExactly({ error: wrappedErrorMessage })).should.be.true();
				});
			});

			describe('with data passed as a command line argument', () => {
				const dataPlainTextCommand = `${commandWithPassphrase} "${encryptedData}"`;

				beforeEach(() => {
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
					(getPassphraseStub.calledWithExactly(vorpal, defaultPassphraseSource, undefined))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(encryptedData, undefined, undefined))
						.should.be.true();
				});

				it('should call the crypto module decrypt method with correct parameters', () => {
					(decryptStub.calledWithExactly(encryptedData, nonce, secret, senderPublicKey))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: defaultPassphraseSource }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoDecryptReturnObject)).should.be.true();
				});
			});

			describe('with data passed via file path', () => {
				const dataFileCommand = `${commandWithPassphrase} --message file:/path/to/message.txt`;

				beforeEach(() => {
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
					(getPassphraseStub.calledWithExactly(vorpal, defaultPassphraseSource, undefined))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(undefined, 'file:/path/to/message.txt', undefined))
						.should.be.true();
				});

				it('should call the crypto module decrypt method with correct parameters', () => {
					(decryptStub.calledWithExactly(encryptedData, nonce, secret, senderPublicKey))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: defaultPassphraseSource, message: 'file:/path/to/message.txt' }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoDecryptReturnObject)).should.be.true();
				});
			});

			describe('with data passed via stdin', () => {
				const dataStdInCommand = `${commandWithPassphrase} --message stdin`;

				beforeEach(() => {
					stdInResult = { data: encryptedData };
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
					(getPassphraseStub.calledWithExactly(vorpal, defaultPassphraseSource, undefined))
						.should.be.true();
				});

				it('should call the input util getData with the correct parameters', () => {
					(getDataStub.calledWithExactly(undefined, 'stdin', encryptedData))
						.should.be.true();
				});

				it('should call the crypto module decrypt method with correct parameters', () => {
					(decryptStub.calledWithExactly(encryptedData, nonce, secret, senderPublicKey))
						.should.be.true();
				});

				it('should print the result', () => {
					(printResultStub.calledWithExactly(vorpal, { passphrase: defaultPassphraseSource, message: 'stdin' }))
						.should.be.true();
					(printSpy.calledWithExactly(cryptoDecryptReturnObject)).should.be.true();
				});
			});
		});

		describe('with passphrase and encrypted data passed via stdin', () => {
			const passphraseAndMessageStdInCommand = `${command} ${senderPublicKey} ${nonce} --message stdin --passphrase stdin`;

			beforeEach(() => {
				stdInResult = { passphrase: secret, data: encryptedData };
				getStdInStub.resolves(stdInResult);
				getDataStub.resolves(encryptedData);
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
				(getPassphraseStub.calledWithExactly(vorpal, 'stdin', secret))
					.should.be.true();
			});

			it('should call the input util getData with the correct parameters', () => {
				(getDataStub.calledWithExactly(undefined, 'stdin', encryptedData))
					.should.be.true();
			});

			it('should call the crypto module encrypt method with correct parameters', () => {
				(decryptStub.calledWithExactly(encryptedData, nonce, secret, senderPublicKey))
					.should.be.true();
			});

			it('should print the result', () => {
				(printResultStub.calledWithExactly(vorpal, { passphrase: 'stdin', message: 'stdin' }))
					.should.be.true();
				(printSpy.calledWithExactly(cryptoDecryptReturnObject)).should.be.true();
			});
		});
	});
});
