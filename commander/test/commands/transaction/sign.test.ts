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
import * as config from '../../../src/utils/config';
import * as printUtils from '../../../src/utils/print';
import * as inputModule from '../../../src/utils/input/utils';
import * as inputUtils from '../../../src/utils/input';

describe('transaction:sign', () => {
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
	const invalidTransaction = 'invalid transaction';
	const defaultInputs = {
		passphrase: '123',
		secondPassphrase: '456',
	};

	const defaultSignedTransaction = Object.assign({}, defaultTransaction, {
		signature:
			'c9c8a9a0d0ba1c8ee519792f286d751071de588448eb984ddd9fe4ea0fe34db474692407004047068dee785abca22a744203fb0342b5404349fa9d6abab1480d',
	});

	const transactionUtilStub = {
		prepareTransaction: sandbox.stub().returns(defaultSignedTransaction),
		validateTransaction: sandbox.stub().returns({ valid: true }),
	};

	const printMethodStub = sandbox.stub();
	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(transactions, 'utils', transactionUtilStub)
			.stub(
				inputUtils,
				'getInputsFromSources',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('transaction:sign', () => {
		setupTest()
			.stub(
				inputModule,
				'getStdIn',
				sandbox.stub().rejects(new Error('Timeout error')),
			)
			.command(['transaction:sign'])
			.catch(error => {
				return expect(error.message).to.contain('No transaction was provided.');
			})
			.it('should throw an error');
	});

	describe('transaction:sign transaction', () => {
		setupTest()
			.command(['transaction:sign', invalidTransaction])
			.catch(error => {
				return expect(error.message).to.contain(
					'Could not parse transaction JSON.',
				);
			})
			.it('should throw an error');

		setupTest()
			.stub(transactions, 'utils', {
				validateTransaction: sandbox.stub().returns({ valid: false }),
			})
			.command(['transaction:sign', JSON.stringify(defaultTransaction)])
			.catch(error => {
				return expect(error.message).to.contain(
					'Provided transaction is invalid.',
				);
			})
			.it('should throw an error when transaction is invalid');

		setupTest()
			.command(['transaction:sign', JSON.stringify(defaultTransaction)])
			.it('should take transaction from arg to sign', () => {
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					secondPassphrase: undefined,
				});
				expect(transactionUtilStub.prepareTransaction).to.be.calledWithExactly(
					defaultTransaction,
					defaultInputs.passphrase,
					defaultInputs.secondPassphrase,
				);
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultSignedTransaction,
				);
			});
	});

	describe('transaction:sign transaction --passphrase=pass:xxx', () => {
		setupTest()
			.command([
				'transaction:sign',
				JSON.stringify(defaultTransaction),
				'--passphrase=pass:123',
			])
			.it(
				'should take transaction from arg and passphrase from flag to sign',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source: 'pass:123',
							repeatPrompt: true,
						},
						secondPassphrase: undefined,
					});
					expect(
						transactionUtilStub.prepareTransaction,
					).to.be.calledWithExactly(
						defaultTransaction,
						defaultInputs.passphrase,
						defaultInputs.secondPassphrase,
					);
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSignedTransaction,
					);
				},
			);
	});

	describe('transaction:sign transaction --passphrase=pass:xxx --second-passphrase=pass:xxx', () => {
		setupTest()
			.command([
				'transaction:sign',
				JSON.stringify(defaultTransaction),
				'--passphrase=pass:123',
				'--second-passphrase=pass:456',
			])
			.it(
				'should take transaction from arg and passphrase and second passphrase from flag to sign',
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
						transactionUtilStub.prepareTransaction,
					).to.be.calledWithExactly(
						defaultTransaction,
						defaultInputs.passphrase,
						defaultInputs.secondPassphrase,
					);
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSignedTransaction,
					);
				},
			);
	});

	describe('transaction | transaction:sign', () => {
		setupTest()
			.stub(inputModule, 'getStdIn', sandbox.stub().resolves({}))
			.command(['transaction:sign'])
			.catch(error => {
				return expect(error.message).to.contain('No transaction was provided.');
			})
			.it('should throw an error when stdin is empty');

		setupTest()
			.stub(
				inputModule,
				'getStdIn',
				sandbox.stub().resolves({ data: invalidTransaction }),
			)
			.command(['transaction:sign'])
			.catch(error => {
				return expect(error.message).to.contain(
					'Could not parse transaction JSON.',
				);
			})
			.it('should throw an error when std is an invalid JSON format');

		setupTest()
			.stub(
				inputModule,
				'getStdIn',
				sandbox.stub().resolves({ data: JSON.stringify(defaultTransaction) }),
			)
			.command(['transaction:sign'])
			.it('should take transaction from stdin and sign', () => {
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					secondPassphrase: undefined,
				});
				expect(transactionUtilStub.prepareTransaction).to.be.calledWithExactly(
					defaultTransaction,
					defaultInputs.passphrase,
					defaultInputs.secondPassphrase,
				);
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultSignedTransaction,
				);
			});
	});

	describe('transaction | transaction:sign --passphrase=pass:xxx', () => {
		setupTest()
			.stub(
				inputModule,
				'getStdIn',
				sandbox.stub().resolves({ data: JSON.stringify(defaultTransaction) }),
			)
			.command(['transaction:sign', '--passphrase=pass:123'])
			.it(
				'should take transaction from stdin and sign with passphrase from flag',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source: 'pass:123',
							repeatPrompt: true,
						},
						secondPassphrase: undefined,
					});
					expect(
						transactionUtilStub.prepareTransaction,
					).to.be.calledWithExactly(
						defaultTransaction,
						defaultInputs.passphrase,
						defaultInputs.secondPassphrase,
					);
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSignedTransaction,
					);
				},
			);
	});

	describe('transaction | transaction:sign --passphrase=pass:xxx --second-passphrase=pass:xxx', () => {
		setupTest()
			.stub(
				inputModule,
				'getStdIn',
				sandbox.stub().resolves({ data: JSON.stringify(defaultTransaction) }),
			)
			.command([
				'transaction:sign',
				'--passphrase=pass:abc',
				'--second-passphrase=pass:def',
			])
			.it(
				'should take transaction from stdin and sign with passphrase and second passphrase from flag',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source: 'pass:abc',
							repeatPrompt: true,
						},
						secondPassphrase: {
							source: 'pass:def',
							repeatPrompt: true,
						},
					});
					expect(
						transactionUtilStub.prepareTransaction,
					).to.be.calledWithExactly(
						defaultTransaction,
						defaultInputs.passphrase,
						defaultInputs.secondPassphrase,
					);
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSignedTransaction,
					);
				},
			);
	});
});
