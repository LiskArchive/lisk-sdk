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
import * as transactions from '@liskhq/lisk-transactions';
import * as validator from '@liskhq/lisk-validator';
import * as config from '../../../../src/utils/config';
import * as printUtils from '../../../../src/utils/print';
import * as readerUtils from '../../../../src/utils/reader';

describe('transaction:create:vote', () => {
	const defaultVote = [
		'356975984361330918L,1000000000',
		'7539210577161571444L,3000000000',
	];
	const defaultUnvote = [
		'356975984361330918L,-1000000000',
		'7539210577161571444L,-3000000000',
	];
	const testnetNetworkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';
	const defaultInputs = '123';
	const defaultTransaction = {
		nonce: '0',
		fee: '10000000',
		amount: '10000000000',
		recipientId: '123L',
		senderPublicKey: null,
		timestamp: 66492418,
		type: 8,
		asset: {},
	};

	const printMethodStub = sandbox.stub();

	const setupStub = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(
				config,
				'getConfig',
				sandbox.stub().returns({ api: { network: 'test' } }),
			)
			.stub(
				transactions,
				'newCastVotes',
				sandbox.stub().returns(defaultTransaction),
			)
			.stub(validator, 'validateAddress', sandbox.stub().returns(true))
			.stub(
				readerUtils,
				'getPassphraseFromPrompt',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('transaction:create:vote', () => {
		setupStub()
			.command(['transaction:create:vote', '1', '100'])
			.catch(error => {
				return expect(error.message).to.contain(
					'At least one vote option must be provided.',
				);
			})
			.it('should throw an error without vote or unvote');
	});

	describe('transaction:create:vote voting', () => {
		const voteValues = defaultVote[0].split(',');
		const vote = {
			delegateAddress: voteValues[0],
			amount: voteValues[1],
		};
		setupStub()
			.command([
				'transaction:create:vote',
				'1',
				'100',
				`--votes=${defaultVote[0]}`,
			])
			.it('should create transaction with only votes', () => {
				expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly(
					'passphrase',
					true,
				);
				expect(validator.validateAddress).to.be.calledWithExactly(
					defaultVote[0].split(',')[0],
				);
				expect(transactions.newCastVotes).to.be.calledWithExactly({
					nonce: '1',
					fee: '10000000000',
					networkIdentifier: testnetNetworkIdentifier,
					passphrase: defaultInputs,
					votes: [vote],
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});

	describe('transaction:create:vote unvoting', () => {
		const voteValues = defaultUnvote[0].split(',');
		const vote = {
			delegateAddress: voteValues[0],
			amount: voteValues[1],
		};

		setupStub()
			.command([
				'transaction:create:vote',
				'1',
				'100',
				`--votes=${defaultUnvote[0]}`,
			])
			.it('should create transaction with only negative votes', () => {
				expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly(
					'passphrase',
					true,
				);
				expect(validator.validateAddress).to.be.calledWithExactly(
					defaultUnvote[0].split(',')[0],
				);
				expect(transactions.newCastVotes).to.be.calledWithExactly({
					nonce: '1',
					fee: '10000000000',
					networkIdentifier: testnetNetworkIdentifier,
					passphrase: defaultInputs,
					votes: [vote],
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});

	describe('transaction:create:vote voting and unvoting', () => {
		const voteValues = defaultVote[0].split(',');
		const vote = {
			delegateAddress: voteValues[0],
			amount: voteValues[1],
		};

		const unvote = { ...vote };
		unvote.amount = `-${unvote.amount}`;

		const validUnvote = { ...unvote };
		validUnvote.delegateAddress = '18070133408355683425L';

		setupStub()
			.command([
				'transaction:create:vote',
				'1',
				'100',
				`--votes=${vote.delegateAddress},${vote.amount}`,
				`--votes=${unvote.delegateAddress},${unvote.amount}`,
			])
			.catch(error => {
				return expect(error.message).to.contain(
					'Delegate address must be unique.',
				);
			})
			.it('should throw an error when vote and unvote are the same');

		setupStub()
			.command([
				'transaction:create:vote',
				'1',
				'100',
				`--votes=${vote.delegateAddress},${vote.amount}`,
				`--votes=${validUnvote.delegateAddress},${validUnvote.amount}`,
			])
			.it('should create a transaction with votes and unvotes', () => {
				expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly(
					'passphrase',
					true,
				);
				expect(validator.validateAddress).to.be.calledWithExactly(
					defaultUnvote[0].split(',')[0],
				);
				expect(validator.validateAddress).to.be.calledWithExactly(
					defaultVote[0].split(',')[0],
				);
				expect(transactions.newCastVotes).to.be.calledWithExactly({
					nonce: '1',
					fee: '10000000000',
					networkIdentifier: testnetNetworkIdentifier,
					passphrase: defaultInputs,
					votes: [vote, validUnvote],
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});

	describe('transaction:create:vote --votes=xxx --unvotes=xxx --no-signature', () => {
		const voteValues = defaultVote[0].split(',');
		const unvoteValues = defaultUnvote[1].split(',');

		const vote = {
			delegateAddress: voteValues[0],
			amount: voteValues[1],
		};
		const unvote = {
			delegateAddress: unvoteValues[1],
			amount: unvoteValues[1],
		};

		setupStub()
			.command([
				'transaction:create:vote',
				'1',
				'100',
				`--votes=${vote.delegateAddress},${vote.amount}`,
				`--votes=${unvote.delegateAddress},${unvote.amount}`,
				'--no-signature',
			])
			.it(
				'should create a transaction with votes and unvotes without signature',
				() => {
					expect(readerUtils.getPassphraseFromPrompt).not.to.be.called;
					expect(validator.validateAddress).to.be.calledWithExactly(
						defaultVote[0].split(',')[0],
					);
					expect(validator.validateAddress).to.be.calledWithExactly(
						defaultUnvote[1].split(',')[1],
					);
					expect(transactions.newCastVotes).to.be.calledWithExactly({
						nonce: '1',
						fee: '10000000000',
						networkIdentifier: testnetNetworkIdentifier,
						passphrase: undefined,
						votes: [vote, unvote],
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultTransaction,
					);
				},
			);
	});

	describe('transaction:create:vote --votes=xxx --unvotes=xxx --passphrase=123', () => {
		const voteValues = defaultVote[0].split(',');
		const unvoteValues = defaultUnvote[1].split(',');

		const vote = {
			delegateAddress: voteValues[0],
			amount: voteValues[1],
		};
		const unvote = {
			delegateAddress: unvoteValues[1],
			amount: unvoteValues[1],
		};

		setupStub()
			.command([
				'transaction:create:vote',
				'1',
				'100',
				`--votes=${vote.delegateAddress},${vote.amount}`,
				`--votes=${unvote.delegateAddress},${unvote.amount}`,
				'--passphrase=123',
			])
			.it(
				'should create a transaction with votes and unvotes with the passphrase from the flag',
				() => {
					expect(readerUtils.getPassphraseFromPrompt).not.to.be.called;
					expect(validator.validateAddress).to.be.calledWithExactly(
						defaultVote[0].split(',')[0],
					);
					expect(validator.validateAddress).to.be.calledWithExactly(
						defaultUnvote[1].split(',')[1],
					);
					expect(transactions.newCastVotes).to.be.calledWithExactly({
						nonce: '1',
						fee: '10000000000',
						networkIdentifier: testnetNetworkIdentifier,
						passphrase: defaultInputs,
						votes: [vote, unvote],
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultTransaction,
					);
				},
			);
	});
});
