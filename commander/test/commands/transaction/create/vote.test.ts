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
import * as transactions from '@liskhq/lisk-transactions';
import * as config from '../../../../src/utils/config';
import * as printUtils from '../../../../src/utils/print';
import * as inputUtils from '../../../../src/utils/input';
import * as inputModule from '../../../../src/utils/input/utils';

describe('transaction:create:vote', () => {
	const defaultVote = [
		'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
		'922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
	];
	const defaultUnvote = [
		'e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589',
		'ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba',
	];
	const fileVotes = [
		'e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589',
		'922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
	];
	const defaultInputs = {
		passphrase: '123',
		secondPassphrase: '456',
	};
	const defaultTransaction = {
		amount: '10000000000',
		recipientId: '123L',
		senderPublicKey: null,
		timestamp: 66492418,
		type: 0,
		fee: '10000000',
		recipientPublicKey: null,
		asset: {},
	};

	const printMethodStub = sandbox.stub();
	const transactionUtilStub = {
		validatePublicKeys: sandbox.stub().returns(true),
	};

	const setupStub = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(
				transactions,
				'castVotes',
				sandbox.stub().returns(defaultTransaction),
			)
			.stub(transactions, 'utils', transactionUtilStub)
			.stub(
				inputModule,
				'getData',
				sandbox.stub().resolves(fileVotes.join(',')),
			)
			.stub(
				inputUtils,
				'getInputsFromSources',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('transaction:create:vote', () => {
		setupStub()
			.command(['transaction:create:vote'])
			.catch(error => {
				return expect(error.message).to.contain(
					'At least one of votes and/or unvotes options must be provided.',
				);
			})
			.it('should throw an error without vote or unvote');
	});

	describe('transaction:create:vote --votes=xxx', () => {
		setupStub()
			.command(['transaction:create:vote', `--votes=${defaultVote.join(',')}`])
			.it('should create transaction with only votes', () => {
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					secondPassphrase: undefined,
				});
				expect(transactionUtilStub.validatePublicKeys).to.be.calledWithExactly(
					defaultVote,
				);
				expect(transactions.castVotes).to.be.calledWithExactly({
					passphrase: defaultInputs.passphrase,
					secondPassphrase: defaultInputs.secondPassphrase,
					votes: defaultVote,
					unvotes: [],
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});

		setupStub()
			.command(['transaction:create:vote', '--votes=file:vote.txt'])
			.it('should create transaction with only votes from the file', () => {
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					secondPassphrase: undefined,
				});
				expect(inputModule.getData).to.be.calledWithExactly('file:vote.txt');
				expect(transactionUtilStub.validatePublicKeys).to.be.calledWithExactly(
					fileVotes,
				);
				expect(transactions.castVotes).to.be.calledWithExactly({
					passphrase: defaultInputs.passphrase,
					secondPassphrase: defaultInputs.secondPassphrase,
					votes: fileVotes,
					unvotes: [],
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});

	describe('transaction:create:vote --unvotes=xxx', () => {
		setupStub()
			.command([
				'transaction:create:vote',
				`--unvotes=${defaultUnvote.join(',')}`,
			])
			.it('should create transaction with only unvotes', () => {
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					secondPassphrase: undefined,
				});
				expect(transactionUtilStub.validatePublicKeys).to.be.calledWithExactly(
					defaultUnvote,
				);
				expect(transactions.castVotes).to.be.calledWithExactly({
					passphrase: defaultInputs.passphrase,
					secondPassphrase: defaultInputs.secondPassphrase,
					votes: [],
					unvotes: defaultUnvote,
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});

		setupStub()
			.command(['transaction:create:vote', '--unvotes=file:unvote.txt'])
			.it('should create transaction with only unvotes from the file', () => {
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					secondPassphrase: undefined,
				});
				expect(inputModule.getData).to.be.calledWithExactly('file:unvote.txt');
				expect(transactionUtilStub.validatePublicKeys).to.be.calledWithExactly(
					fileVotes,
				);
				expect(transactions.castVotes).to.be.calledWithExactly({
					passphrase: defaultInputs.passphrase,
					secondPassphrase: defaultInputs.secondPassphrase,
					votes: [],
					unvotes: fileVotes,
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});

	describe('transaction:create:vote --votes=xxx --unvotes=xxx', () => {
		setupStub()
			.command([
				'transaction:create:vote',
				`--votes=${defaultVote.join(',')}`,
				`--unvotes=${defaultVote.join(',')}`,
			])
			.catch(error => {
				return expect(error.message).to.contain(
					'Votes and unvotes sources must not be the same.',
				);
			})
			.it('should throw an error when vote and unvote are the same');

		setupStub()
			.command([
				'transaction:create:vote',
				`--votes=${defaultVote.join(',')}`,
				`--unvotes=${defaultUnvote.join(',')}`,
			])
			.it('should create a transaction with votes and unvotes', () => {
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					secondPassphrase: undefined,
				});
				expect(transactionUtilStub.validatePublicKeys).to.be.calledWithExactly(
					defaultVote,
				);
				expect(transactionUtilStub.validatePublicKeys).to.be.calledWithExactly(
					defaultUnvote,
				);
				expect(transactions.castVotes).to.be.calledWithExactly({
					passphrase: defaultInputs.passphrase,
					secondPassphrase: defaultInputs.secondPassphrase,
					votes: defaultVote,
					unvotes: defaultUnvote,
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});

	describe('transaction:create:vote --votes=xxx --unvotes=xxx --no-signature', () => {
		setupStub()
			.command([
				'transaction:create:vote',
				`--votes=${defaultVote.join(',')}`,
				`--unvotes=${defaultUnvote.join(',')}`,
				'--no-signature',
			])
			.it(
				'should create a transaction with votes and unvotes without signature',
				() => {
					expect(inputUtils.getInputsFromSources).not.to.be.called;
					expect(
						transactionUtilStub.validatePublicKeys,
					).to.be.calledWithExactly(defaultVote);
					expect(
						transactionUtilStub.validatePublicKeys,
					).to.be.calledWithExactly(defaultUnvote);
					expect(transactions.castVotes).to.be.calledWithExactly({
						passphrase: undefined,
						secondPassphrase: undefined,
						votes: defaultVote,
						unvotes: defaultUnvote,
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultTransaction,
					);
				},
			);
	});

	describe('transaction:create:vote --votes=xxx --unvotes=xxx --passphrase=pass:123', () => {
		setupStub()
			.command([
				'transaction:create:vote',
				`--votes=${defaultVote.join(',')}`,
				`--unvotes=${defaultUnvote.join(',')}`,
				'--passphrase=pass:123',
			])
			.it(
				'should create a transaction with votes and unvotes with the passphrase from the flag',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source: 'pass:123',
							repeatPrompt: true,
						},
						secondPassphrase: undefined,
					});
					expect(
						transactionUtilStub.validatePublicKeys,
					).to.be.calledWithExactly(defaultVote);
					expect(
						transactionUtilStub.validatePublicKeys,
					).to.be.calledWithExactly(defaultUnvote);
					expect(transactions.castVotes).to.be.calledWithExactly({
						passphrase: defaultInputs.passphrase,
						secondPassphrase: defaultInputs.secondPassphrase,
						votes: defaultVote,
						unvotes: defaultUnvote,
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultTransaction,
					);
				},
			);
	});

	describe('transaction:create:vote --votes=xxx --unvotes=xxx --passphrase=pass:123 --second-passphrase=pass:456', () => {
		setupStub()
			.command([
				'transaction:create:vote',
				`--votes=${defaultVote.join(',')}`,
				`--unvotes=${defaultUnvote.join(',')}`,
				'--passphrase=pass:123',
				'--second-passphrase=pass:456',
			])
			.it(
				'should create a transaction with votes and unvotes with the passphrase and second passphrase from the flag',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source: 'pass:123',
							repeatPrompt: true,
						},
						secondPassphrase: {
							source: 'pass:456',
							repeatPrompt: true,
						},
					});
					expect(
						transactionUtilStub.validatePublicKeys,
					).to.be.calledWithExactly(defaultVote);
					expect(
						transactionUtilStub.validatePublicKeys,
					).to.be.calledWithExactly(defaultUnvote);
					expect(transactions.castVotes).to.be.calledWithExactly({
						passphrase: defaultInputs.passphrase,
						secondPassphrase: defaultInputs.secondPassphrase,
						votes: defaultVote,
						unvotes: defaultUnvote,
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultTransaction,
					);
				},
			);
	});
});
