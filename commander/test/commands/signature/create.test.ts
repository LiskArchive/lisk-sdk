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
import * as inputUtils from '../../../src/utils/input/utils';
import * as inputUtilsModule from '../../../src/utils/input';

describe('signature:create', () => {
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
		signature:
			'b88d0408318d3bf700586116046c9101535ee76d2d4b6a5903ac31f5d302094ad4b08180105ff91882482d5d62ca48ba2ed281b75134b90110e1a98aed7efe0d',
		id: '3436168030012755419',
	};
	const invalidTransaction = 'invalid transaction';
	const defaultInputs = {
		passphrase:
			'better across runway mansion jar route valid crack panic favorite smooth sword',
	};
	const testnetNetworkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

	const defaultSignatureObject = {
		transactionId: '3436168030012755419',
		publicKey:
			'6766ce280eb99e45d2cc7d9c8c852720940dab5d69f480e80477a97b4255d5d8',
		signature:
			'4424342c342093f80f52f919876fc0abada5385e98e8caf211add16d1c0f5453ef6e47fa58a454128a9640f3b6e2ade618e5ee5fa8eebc4d68460d19f042050f',
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
				transactions,
				'createSignatureObject',
				sandbox.stub().returns(defaultSignatureObject),
			)
			.stub(
				inputUtilsModule,
				'getInputsFromSources',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('signature:create', () => {
		setupTest()
			.stub(
				inputUtils,
				'getStdIn',
				sandbox.stub().rejects(new Error('Timeout error')),
			)
			.command(['signature:create'])
			.catch((error: Error) => {
				return expect(error.message).to.contain('No transaction was provided.');
			})
			.it('should throw an error');
	});

	describe('signature:create transaction', () => {
		setupTest()
			.command(['signature:create', invalidTransaction])
			.catch((error: Error) => {
				return expect(error.message).to.contain(
					'Could not parse transaction JSON.',
				);
			})
			.it('should throw an error');

		setupTest()
			.command([
				'signature:create',
				JSON.stringify({ ...defaultTransaction, signature: 'wrong' }),
			])
			.catch((error: Error) => {
				return expect(error.message).to.contain(
					'Provided transaction is invalid.',
				);
			})
			.it('should throw an error when transaction is invalid');

		setupTest()
			.command(['signature:create', JSON.stringify(defaultTransaction)])
			.it('should take transaction from arg to create', () => {
				expect(inputUtilsModule.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
				});
				expect(transactions.createSignatureObject).to.be.calledWithExactly({
					transaction: defaultTransaction,
					passphrase: defaultInputs.passphrase,
					networkIdentifier: testnetNetworkIdentifier,
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultSignatureObject,
				);
			});
	});

	describe('signature:create --passphrase=pass:xxx', () => {
		setupTest()
			.command([
				'signature:create',
				JSON.stringify(defaultTransaction),
				'--passphrase=pass:123',
			])
			.it(
				'should take transaction from arg and passphrase from flag to create',
				() => {
					expect(inputUtilsModule.getInputsFromSources).to.be.calledWithExactly(
						{
							passphrase: {
								source: 'pass:123',
								repeatPrompt: true,
							},
						},
					);
					expect(transactions.createSignatureObject).to.be.calledWithExactly({
						transaction: defaultTransaction,
						passphrase: defaultInputs.passphrase,
						networkIdentifier: testnetNetworkIdentifier,
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSignatureObject,
					);
				},
			);
	});

	describe('transaction | signature:create', () => {
		setupTest()
			.stub(inputUtils, 'getStdIn', sandbox.stub().resolves({}))
			.command(['signature:create'])
			.catch((error: Error) => {
				return expect(error.message).to.contain('No transaction was provided.');
			})
			.it('should throw an error when stdin is empty');

		setupTest()
			.stub(
				inputUtils,
				'getStdIn',
				sandbox.stub().resolves({ data: invalidTransaction }),
			)
			.command(['signature:create'])
			.catch((error: Error) => {
				return expect(error.message).to.contain(
					'Could not parse transaction JSON.',
				);
			})
			.it('should throw an error when std is an invalid JSON format');

		setupTest()
			.stub(
				inputUtils,
				'getStdIn',
				sandbox.stub().resolves({ data: JSON.stringify(defaultTransaction) }),
			)
			.command(['signature:create'])
			.it(
				'should take transaction from stdin and create signature object',
				() => {
					expect(inputUtilsModule.getInputsFromSources).to.be.calledWithExactly(
						{
							passphrase: {
								source: undefined,
								repeatPrompt: true,
							},
						},
					);
					expect(transactions.createSignatureObject).to.be.calledWithExactly({
						transaction: defaultTransaction,
						passphrase: defaultInputs.passphrase,
						networkIdentifier: testnetNetworkIdentifier,
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSignatureObject,
					);
				},
			);
	});

	describe('transaction | signature:create --passphrase=pass:xxx', () => {
		setupTest()
			.stub(
				inputUtils,
				'getStdIn',
				sandbox.stub().resolves({ data: JSON.stringify(defaultTransaction) }),
			)
			.command(['signature:create', '--passphrase=pass:123'])
			.it(
				'should take transaction from stdin and sign with passphrase from flag',
				() => {
					expect(inputUtilsModule.getInputsFromSources).to.be.calledWithExactly(
						{
							passphrase: {
								source: 'pass:123',
								repeatPrompt: true,
							},
						},
					);
					expect(transactions.createSignatureObject).to.be.calledWithExactly({
						transaction: defaultTransaction,
						passphrase: defaultInputs.passphrase,
						networkIdentifier: testnetNetworkIdentifier,
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSignatureObject,
					);
				},
			);
	});
});
