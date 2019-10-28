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
import * as inputModule from '../../../src/utils/input/utils';
import * as inputUtils from '../../../src/utils/input';

describe('transaction:sign', () => {
	const defaultTransaction = {
		type: 8,
		senderPublicKey:
			'efaf1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8d',
		timestamp: 54316325,
		asset: {
			recipientId: '18141291412139607230L',
			amount: '1234567890',
			data: 'random data',
		},
	};

	const invalidTransaction = 'invalid transaction';
	const defaultInputs = {
		passphrase:
			'wear protect skill sentence lift enter wild sting lottery power floor neglect',
	};

	const defaultInputsWithSecondPassphrase = {
		...defaultInputs,
		secondPassphrase:
			'inherit moon normal relief spring bargain hobby join baby flash fog blood',
	};

	const defaultSignedTransaction = {
		...defaultTransaction,
		fee: '10000000',
		senderId: '2129300327344985743L',
		signatures: [],
		signature:
			'b88d0408318d3bf700586116046c9101535ee76d2d4b6a5903ac31f5d302094ad4b08180105ff91882482d5d62ca48ba2ed281b75134b90110e1a98aed7efe0d',
		id: '3436168030012755419',
	};

	const defaultSecondSignedTransaction = {
		...defaultSignedTransaction,
		id: '1856045075247127242',
		signSignature:
			'c4b0ca84aa4596401c3041a1638e670d6278e0e18949f027b3d7ede4f2f0a1685df7aec768b1a3c49acfe7ded9e7f5230998f06b0d58371bcba5a00695fb6901',
	};

	const printMethodStub = sandbox.stub();
	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(
				config,
				'getConfig',
				sandbox.stub().returns({ api: { network: 'test' } }),
			)
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
			.command([
				'transaction:sign',
				JSON.stringify({
					...defaultTransaction,
					asset: { ...defaultTransaction.asset, amount: '-1' },
				}),
			])
			.catch(error => {
				return expect(error.message).to.contain(
					'Transaction: 6662515125650388309 failed at .amount',
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
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSignedTransaction,
					);
				},
			);
	});

	describe('transaction:sign transaction --passphrase=pass:xxx --second-passphrase=pass:xxx', () => {
		setupTest()
			.stub(
				inputUtils,
				'getInputsFromSources',
				sandbox.stub().resolves(defaultInputsWithSecondPassphrase),
			)
			.command([
				'transaction:sign',
				JSON.stringify(defaultTransaction),
				`--passphrase=pass:${defaultInputs.passphrase}`,
				`--second-passphrase=pass:${
					defaultInputsWithSecondPassphrase.secondPassphrase
				}`,
			])
			.it(
				'should take transaction from arg and passphrase and second passphrase from flag to sign',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source: `pass:${defaultInputs.passphrase}`,
							repeatPrompt: true,
						},
						secondPassphrase: {
							source: `pass:${
								defaultInputsWithSecondPassphrase.secondPassphrase
							}`,
							repeatPrompt: true,
						},
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSecondSignedTransaction,
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
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSignedTransaction,
					);
				},
			);
	});
});
