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
import encryptCommand from '../../src/commands/encryptPassphrase';
import cryptoModule from '../../src/utils/cryptoModule';
import * as input from '../../src/utils/input';
import * as print from '../../src/utils/print';
import {
	getCommands,
	getRequiredArgs,
	setUpVorpalWithCommand,
} from './utils';

describe('encryptPassphrase command', () => {
	const commandName = 'encryptPassphrase';
	let vorpal;

	beforeEach(() => {
		vorpal = setUpVorpalWithCommand(encryptCommand);
	});

	afterEach(() => {
		vorpal.ui.removeAllListeners();
	});

	describe('setup', () => {
		it('should be available', () => {
			const encryptPassphraseCommands = getCommands(vorpal, commandName);
			(encryptPassphraseCommands).should.have.length(1);
		});

		it('should require 0 inputs', () => {
			const requiredArgs = getRequiredArgs(vorpal, commandName);
			(requiredArgs).should.have.length(0);
		});
	});

	describe('when executed', () => {
		const defaultErrorMessage = 'Some error message.';
		const wrappedErrorMessage = `Could not encrypt passphrase: ${defaultErrorMessage}`;
		const command = 'encryptPassphrase';

		let getStdInStub;
		let encryptPassphraseStub;
		let printSpy;
		let printResultStub;

		beforeEach(() => {
			getStdInStub = sinon.stub(input, 'getStdIn').resolves({});
			encryptPassphraseStub = sinon.stub(cryptoModule, 'encryptPassphrase');
			printSpy = sinon.spy();
			printResultStub = sinon.stub(print, 'printResult').returns(printSpy);
		});

		afterEach(() => {
			getStdInStub.restore();
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
				it('should inform the user the encryption was not successful');
			});

			describe('with passphrase passed via prompt', () => {
				it('should call the input util getStdIn with the correct parameters');
				it('should call the input util getPassphrase with the correct parameters for the passphrase');
				it('should call the input util getPassphrase with the correct parameters for the password');
				it('should call the crypto module encryptPassphrase method with correct parameters');
				it('should print the result');
			});

			describe('with plaintext passphrase passed via command line', () => {
				it('should call the input util getStdIn with the correct parameters');
				it('should call the input util getPassphrase with the correct parameters for the passphrase');
				it('should call the input util getPassphrase with the correct parameters for the password');
				it('should call the crypto module encryptPassphrase method with correct parameters');
				it('should print the result');
			});

			describe('with passphrase passed via environmental variable', () => {
				it('should call the input util getStdIn with the correct parameters');
				it('should call the input util getPassphrase with the correct parameters for the passphrase');
				it('should call the input util getPassphrase with the correct parameters for the password');
				it('should call the crypto module encryptPassphrase method with correct parameters');
				it('should print the result');
			});

			describe('with passphrase passed via file path', () => {
				it('should call the input util getStdIn with the correct parameters');
				it('should call the input util getPassphrase with the correct parameters for the passphrase');
				it('should call the input util getPassphrase with the correct parameters for the password');
				it('should call the crypto module encryptPassphrase method with correct parameters');
				it('should print the result');
			});

			describe('with passphrase passed via stdin', () => {
				it('should call the input util getStdIn with the correct parameters');
				it('should call the input util getPassphrase with the correct parameters for the passphrase');
				it('should call the input util getPassphrase with the correct parameters for the password');
				it('should call the crypto module encryptPassphrase method with correct parameters');
				it('should print the result');
			});
		});

		describe('password', () => {
			describe('if the password cannot be retrieved', () => {
				it('should inform the user the encryption was not successful');
			});

			describe('with password passed via prompt', () => {
				it('should call the input util getStdIn with the correct parameters');
				it('should call the input util getPassphrase with the correct parameters for the passphrase');
				it('should call the input util getPassphrase with the correct parameters for the password');
				it('should call the crypto module encryptPassphrase method with correct parameters');
				it('should print the result');
			});

			describe('with plaintext password passed via command line', () => {
				it('should call the input util getStdIn with the correct parameters');
				it('should call the input util getPassphrase with the correct parameters for the passphrase');
				it('should call the input util getPassphrase with the correct parameters for the password');
				it('should call the crypto module encryptPassphrase method with correct parameters');
				it('should print the result');
			});

			describe('with password passed via environmental variable', () => {
				it('should call the input util getStdIn with the correct parameters');
				it('should call the input util getPassphrase with the correct parameters for the passphrase');
				it('should call the input util getPassphrase with the correct parameters for the password');
				it('should call the crypto module encryptPassphrase method with correct parameters');
				it('should print the result');
			});

			describe('with password passed via file path', () => {
				it('should call the input util getStdIn with the correct parameters');
				it('should call the input util getPassphrase with the correct parameters for the passphrase');
				it('should call the input util getPassphrase with the correct parameters for the password');
				it('should call the crypto module encryptPassphrase method with correct parameters');
				it('should print the result');
			});

			describe('with password passed via stdin', () => {
				it('should call the input util getStdIn with the correct parameters');
				it('should call the input util getPassphrase with the correct parameters for the passphrase');
				it('should call the input util getPassphrase with the correct parameters for the password');
				it('should call the crypto module encryptPassphrase method with correct parameters');
				it('should print the result');
			});
		});

		describe('with passphrase and password passed via stdin', () => {
			it('should call the input util getStdIn with the correct parameters');
			it('should call the input util getPassphrase with the correct parameters for the passphrase');
			it('should call the input util getPassphrase with the correct parameters for the password');
			it('should call the crypto module encryptPassphrase method with correct parameters');
			it('should print the result');
		});
	});
});
