/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
import { expect, test } from '@oclif/test';
import * as config from '../../../src/utils/config';
import * as printUtils from '../../../src/utils/print';
import TransferCommand from '../../../src/commands/transaction/create/transfer';
import DelegateCommand from '../../../src/commands/transaction/create/delegate';
import VoteCommand from '../../../src/commands/transaction/create/vote';

describe('transaction:create', () => {
	const printMethodStub = sandbox.stub();
	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(
				config,
				'getConfig',
				sandbox.stub().returns({ api: { network: 'test' } }),
			)
			.stub(TransferCommand, 'run', sandbox.stub())
			.stub(DelegateCommand, 'run', sandbox.stub())
			.stub(VoteCommand, 'run', sandbox.stub());

	describe('transaction:create', () => {
		setupTest()
			.command(['transaction:create'])
			.catch(error => {
				return expect(error.message).to.contain('Missing required flag');
			})
			.it('should throw an error when type is not provided');
	});

	describe('transaction:create --type=xxx', () => {
		setupTest()
			.command(['transaction:create', '--type=wrongtype'])
			.catch(error => {
				return expect(error.message).to.contain(
					'Expected --type=wrongtype to be one of',
				);
			})
			.it('should throw an error when type is not in the options');

		setupTest()
			.command(['transaction:create', '--type=8'])
			.it('should call type 0 command with flag type=9', () => {
				return expect(TransferCommand.run).to.be.calledWithExactly([]);
			});

		setupTest()
			.command(['transaction:create', '--type=transfer'])
			.it('should call type 0 command with flag type=transfer', () => {
				return expect(TransferCommand.run).to.be.calledWithExactly([]);
			});

		setupTest()
			.command(['transaction:create', '--type=10', 'username'])
			.it('should call type 2 command with flag type=10', () => {
				return expect(DelegateCommand.run).to.be.calledWithExactly([
					'username',
				]);
			});

		setupTest()
			.command(['transaction:create', '-t=delegate', '--json', 'username'])
			.it('should call type 2 command with flag type=delegate', () => {
				return expect(DelegateCommand.run).to.be.calledWithExactly([
					'username',
					'--json',
				]);
			});

		setupTest()
			.command(['transaction:create', '--type=11', '--votes=xxx,yyy'])
			.it('should call type 3 command with flag type=11', () => {
				return expect(VoteCommand.run).to.be.calledWithExactly([
					'--votes',
					'xxx,yyy',
				]);
			});

		setupTest()
			.command(['transaction:create', '-t=vote', '--votes=xxx,xxx'])
			.it('should call type 3 command with flag type=vote', () => {
				return expect(VoteCommand.run).to.be.calledWithExactly([
					'--votes',
					'xxx,xxx',
				]);
			});
	});
});
