/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import { test } from '@oclif/test';
import * as config from '../../../src/utils/config';
import * as print from '../../../src/utils/print';
import TransferCommand from '../../../src/commands/transaction/create/transfer';
import SecondpassphraseCommand from '../../../src/commands/transaction/create/secondpassphrase';
import VoteCommand from '../../../src/commands/transaction/create/vote';
import DelegateCommand from '../../../src/commands/transaction/create/delegate';
import MultisignatureCommand from '../../../src/commands/transaction/create/multisignature';

describe('transaction:create', () => {
	const printMethodStub = sandbox.stub();
	const setupTest = () =>
		test
			.stub(print, 'default', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(TransferCommand, 'run', sandbox.stub())
			.stub(SecondpassphraseCommand, 'run', sandbox.stub())
			.stub(VoteCommand, 'run', sandbox.stub())
			.stub(DelegateCommand, 'run', sandbox.stub())
			.stub(MultisignatureCommand, 'run', sandbox.stub());

	describe('transaction:create', () => {
		setupTest()
			.command(['transaction:create'])
			.catch(error => expect(error.message).to.contain('Missing required flag'))
			.it('should throw an error when type is not provided');
	});

	describe('transaction:create --type=xxx', () => {
		setupTest()
			.command(['transaction:create', '--type=wrongtype'])
			.catch(error =>
				expect(error.message).to.contain(
					'Expected --type=wrongtype to be one of',
				),
			)
			.it('should throw an error when type is not in the options');

		setupTest()
			.command(['transaction:create', '--type=0'])
			.it('should call type 0 command', () => {
				return expect(TransferCommand.run).to.be.calledWithExactly([]);
			});

		setupTest()
			.command(['transaction:create', '-t=secondpassphrase', '--no-json'])
			.it('should call type 1 command', () => {
				return expect(SecondpassphraseCommand.run).to.be.calledWithExactly([
					'--no-json',
				]);
			});

		setupTest()
			.command(['transaction:create', '-t=vote', '--votes=xxx,xxx'])
			.it('should call type 2 command', () => {
				return expect(VoteCommand.run).to.be.calledWithExactly([
					'--votes',
					'xxx,xxx',
				]);
			});

		setupTest()
			.command(['transaction:create', '-t=delegate', '--json', 'username'])
			.it('should call type 3 command', () => {
				return expect(DelegateCommand.run).to.be.calledWithExactly([
					'username',
					'--json',
				]);
			});

		setupTest()
			.command(['transaction:create', '-t=4', '24', '2', 'itshouldbe,hex'])
			.it('should call type 3 command', () => {
				return expect(MultisignatureCommand.run).to.be.calledWithExactly([
					'24',
					'2',
					'itshouldbe,hex',
				]);
			});
	});
});
