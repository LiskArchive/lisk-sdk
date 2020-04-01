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
import * as sandbox from 'sinon';
import { expect, test } from '@oclif/test';
import * as config from '../../../src/utils/config';
import * as printUtils from '../../../src/utils/print';
import TransferCommand from '../../../src/commands/transaction/create/transfer';
import MultisignatureCommand from '../../../src/commands/transaction/create/multisignature';
import DelegateCommand from '../../../src/commands/transaction/create/delegate';
import VoteCommand from '../../../src/commands/transaction/create/vote';
import UnlockCommand from '../../../src/commands/transaction/create/unlock';

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
			.stub(VoteCommand, 'run', sandbox.stub())
			.stub(MultisignatureCommand, 'run', sandbox.stub())
			.stub(UnlockCommand, 'run', sandbox.stub());

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
			.it('should call type 8 command with flag type=8', () => {
				return expect(TransferCommand.run).to.be.calledWithExactly([]);
			});

		setupTest()
			.command(['transaction:create', '--type=transfer'])
			.it('should call type 8 transfer with flag type=transfer', () => {
				return expect(TransferCommand.run).to.be.calledWithExactly([]);
			});

		setupTest()
			.command(['transaction:create', '--type=10', 'username'])
			.it('should call type 10 command with flag type=10', () => {
				return expect(DelegateCommand.run).to.be.calledWithExactly([
					'username',
				]);
			});

		setupTest()
			.command(['transaction:create', '-t=delegate', '--json', 'username'])
			.it('should call type 10 command with flag type=delegate', () => {
				return expect(DelegateCommand.run).to.be.calledWithExactly([
					'username',
					'--json',
				]);
			});

		setupTest()
			.command([
				'transaction:create',
				'--type=13',
				'--votes=18070133408355683425L,15000000000',
			])
			.it('should call type 13 command with flag type=13', () => {
				return expect(VoteCommand.run).to.be.calledWithExactly([
					'--votes=18070133408355683425L,15000000000',
				]);
			});

		setupTest()
			.command([
				'transaction:create',
				'-t=vote',
				'--votes=18070133408355683425L,15000000000',
			])
			.it('should call type 13 command with flag type=vote', () => {
				return expect(VoteCommand.run).to.be.calledWithExactly([
					'--votes=18070133408355683425L,15000000000',
				]);
			});

		setupTest()
			.command([
				'transaction:create',
				'--type=12',
				'--mandatory-key=xxx',
				'--optional-key=yyy',
			])
			.it('should call type 12 command with flag type=12', () => {
				return expect(MultisignatureCommand.run).to.be.calledWithExactly([
					'--mandatory-key=xxx',
					'--optional-key=yyy',
				]);
			});

		setupTest()
			.command([
				'transaction:create',
				'-t=multisignature',
				'--mandatory-key=xxx',
				'--optional-key=yyy',
			])
			.it('should call type 12 command with flag type=multisignature', () => {
				return expect(MultisignatureCommand.run).to.be.calledWithExactly([
					'--mandatory-key=xxx',
					'--optional-key=yyy',
				]);
			});

		setupTest()
			.command(['transaction:create', '--type=14', '--unlock=xxx,yyy,zzz'])
			.it('should call type 14 command with flag type=14', () => {
				return expect(UnlockCommand.run).to.be.calledWithExactly([
					'--unlock=xxx,yyy,zzz',
				]);
			});

		setupTest()
			.command(['transaction:create', '--type=unlock', '--unlock=xxx,yyy,zzz'])
			.it('should call type 14 command with flag type=unlock', () => {
				return expect(UnlockCommand.run).to.be.calledWithExactly([
					'--unlock=xxx,yyy,zzz',
				]);
			});

		setupTest()
			.command([
				'transaction:create',
				'--type=unlock',
				'--unlock=xxx,yyy,zzz',
				'--unlock=xxx,yyy,zzz',
				'--unlock=xxx,yyy,zzz',
				'--unlock=xxx,yyy,zzz',
				'--unlock=xxx,yyy,zzz',
				'--unlock=xxx,yyy,zzz',
			])
			.it('should allow to use more flags and arguments', () => {
				return expect(UnlockCommand.run).to.be.calledWithExactly([
					'--unlock=xxx,yyy,zzz',
					'--unlock=xxx,yyy,zzz',
					'--unlock=xxx,yyy,zzz',
					'--unlock=xxx,yyy,zzz',
					'--unlock=xxx,yyy,zzz',
					'--unlock=xxx,yyy,zzz',
				]);
			});
	});
});
