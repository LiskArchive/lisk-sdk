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
import decrypt from '../../src/commands/decrypt';
import cryptoModule from '../../src/utils/cryptoModule';
import tablify from '../../src/utils/tablify';
import { setUpVorpalWithCommand } from './utils';

describe('lisky decrypt command palette', () => {
	let capturedOutput;
	let vorpal;

	beforeEach(() => {
		capturedOutput = [];
		vorpal = setUpVorpalWithCommand(decrypt, capturedOutput);
	});

	// eslint-disable-next-line no-underscore-dangle
	const commandFilter = command => command._name === 'decrypt';
	const argsFilter = arg => arg.required;

	describe('setup', () => {
		it('should be available', () => {
			const decryptCommands = vorpal.commands.filter(commandFilter);
			(decryptCommands).should.have.length(1);
		});

		it('should require 4 inputs', () => {
			const encryptCommand = vorpal.commands.filter(commandFilter)[0];
			// eslint-disable-next-line no-underscore-dangle
			const requiredArgs = encryptCommand._args.filter(argsFilter);
			(requiredArgs).should.have.length(4);
		});
	});

	describe('when executed', () => {
		// message: 'Hello Lisker'
		const encryptedMessage = '4728715ed4463a37d8e90720a27377f04a84911b95520c2582a8b6da';
		const nonce = '682be05eeb73a794163b5584cac6b33769c2abd867459cae';
		const secret = 'recipient secret';
		// sender secret: 'sender secret'
		const senderPublicKey = '38433137692948be1c05bbae686c9c850d3c8d9c52c1aebb4a7c1d5dd6d010d7';
		const command = `decrypt "${encryptedMessage}" "${nonce}" "${secret}" "${senderPublicKey}"`;
		const cryptoDecryptReturnObject = {
			message: 'Hello Lisker',
		};
		const tableOutput = tablify(cryptoDecryptReturnObject).toString();
		const jsonOutput = JSON.stringify(cryptoDecryptReturnObject);

		let decryptStub;

		beforeEach(() => {
			decryptStub = sinon.stub(cryptoModule, 'decrypt').returns(cryptoDecryptReturnObject);
		});

		afterEach(() => {
			decryptStub.restore();
		});

		it('should handle valid parameters', () => {
			return vorpal.exec(command)
				.then(() => {
					(decryptStub.calledWithExactly(encryptedMessage, nonce, secret, senderPublicKey))
						.should.be.true();
				});
		});

		it('should print the returned object', () => {
			return vorpal.exec(command)
				.then(() => (capturedOutput[0]).should.equal(tableOutput));
		});

		it('should print json with --json option', () => {
			const jsonCommand = `${command} --json`;
			return vorpal.exec(jsonCommand)
				.then(() => (capturedOutput[0]).should.equal(jsonOutput));
		});

		it('should handle a -j shorthand for --json option', () => {
			const jCommand = `${command} -j`;
			return vorpal.exec(jCommand)
				.then(() => (capturedOutput[0]).should.equal(jsonOutput));
		});

		it('should print a table with --no-json option', () => {
			const noJsonCommand = `${command} --no-json`;
			return vorpal.exec(noJsonCommand)
				.then(() => (capturedOutput[0]).should.equal(tableOutput));
		});
	});
});
