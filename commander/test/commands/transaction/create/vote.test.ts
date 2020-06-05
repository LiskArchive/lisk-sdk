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

// This needs to be re-implemented using codec with https://github.com/LiskHQ/lisk-core/issues/254
// eslint-disable-next-line mocha/no-skipped-tests
describe.skip('transaction:create:vote', () => {
	const defaultVote = ['356975984361330918L,10', '7539210577161571444L,30'];
	const defaultUnvote = ['356975984361330918L,-10', '7539210577161571444L,-30'];
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
				'castVotes',
				sandbox.stub().returns(defaultTransaction),
			)
			.stub(validator, 'validateAddress', sandbox.stub().returns(true))
			.stub(
				readerUtils,
				'getPassphraseFromPrompt',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('transaction:create:vote voting', () => {
		const voteValues = defaultVote[0].split(',');
		const vote = {
			delegateAddress: voteValues[0],
			amount: String(Number(voteValues[1]) ** 9),
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
				expect(transactions.castVotes).to.be.calledWithExactly({
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

	describe('transaction:create:vote --votes=downvote', () => {
		const voteValues = defaultUnvote[0].split(',');
		const vote = {
			delegateAddress: voteValues[0],
			amount: String(Number(voteValues[1]) ** 9),
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
				expect(transactions.castVotes).to.be.calledWithExactly({
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

	describe('transaction:create:vote --votes=upvote --votes=downvote', () => {
		const voteValues = defaultVote[0].split(',');
		const vote = {
			delegateAddress: voteValues[0],
			amount: String(Number(voteValues[1]) ** 9),
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
				`--votes=${vote.delegateAddress},${voteValues[1]}`,
				`--votes=${unvote.delegateAddress},-${voteValues[1]}`,
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
				`--votes=${vote.delegateAddress},${voteValues[1]}`,
				`--votes=${validUnvote.delegateAddress},-${voteValues[1]}`,
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
				expect(transactions.castVotes).to.be.calledWithExactly({
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

	describe('transaction:create:vote --votes=upvote --votes=downvote --no-signature', () => {
		const voteValues = defaultVote[0].split(',');
		const unvoteValues = defaultUnvote[1].split(',');

		const vote = {
			delegateAddress: voteValues[0],
			amount: String(Number(voteValues[1]) ** 9),
		};
		const unvote = {
			delegateAddress: unvoteValues[0],
			amount: '-3000000000',
		};

		setupStub()
			.command([
				'transaction:create:vote',
				'1',
				'100',
				`--votes=${vote.delegateAddress},${voteValues[1]}`,
				`--votes=${unvote.delegateAddress},-30`,
				'--no-signature',
			])
			.it(
				'should create a transaction with votes and unvotes without signature',
				() => {
					expect(readerUtils.getPassphraseFromPrompt).not.to.be.called;
					expect(validator.validateAddress).to.be.calledWithExactly(
						voteValues[0],
					);
					expect(validator.validateAddress).to.be.calledWithExactly(
						unvoteValues[0],
					);
					expect(transactions.castVotes).to.be.calledWithExactly({
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

	describe('transaction:create:vote --votes=upvote --votes=downvote --passphrase=123', () => {
		const voteValues = defaultVote[0].split(',');
		const unvoteValues = defaultUnvote[1].split(',');

		const vote = {
			delegateAddress: voteValues[0],
			amount: String(Number(voteValues[1]) ** 9),
		};
		const unvote = {
			delegateAddress: unvoteValues[0],
			amount: '-3000000000',
		};

		setupStub()
			.command([
				'transaction:create:vote',
				'1',
				'100',
				`--votes=${vote.delegateAddress},${voteValues[1]}`,
				`--votes=${unvote.delegateAddress},-30`,
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
						defaultUnvote[1].split(',')[0],
					);
					expect(transactions.castVotes).to.be.calledWithExactly({
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
