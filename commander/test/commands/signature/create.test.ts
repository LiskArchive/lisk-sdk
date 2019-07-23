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
		amount: '10',
		recipientId: '8050281191221330746L',
		senderPublicKey:
			'3358a1562f9babd523a768e700bb12ad58f230f84031055802dc0ea58cef1e1b',
		timestamp: 59353522,
		type: 0,
		fee: '10000000',
		recipientPublicKey: null,
		asset: {},
		signature:
			'b84b95087c381ad25b5701096e2d9366ffd04037dcc941cd0747bfb0cf93111834a6c662f149018be4587e6fc4c9f5ba47aa5bbbd3dd836988f153aa8258e604',
		id: '3694188453012384790',
	};
	const invalidTransaction = 'invalid transaction';
	const defaultInputs = {
		passphrase: '123',
	};

	const defaultSignatureObject = {
		transactionId: '3694188453012384790',
		publicKey:
			'6edfa4a73d7e2a71e61fbb80aaf6e578a9c7be779382c6d7fc99e086400c830f',
		signature:
			'ba8250a2192cb0b70283993d4fa6c6e625a422b16829b38a6c6c14b2ad82411e2e8523abac35162e1c28d8dd35bbe7821b2945640c8baab95b00fb2525bdb807',
	};

	const printMethodStub = sandbox.stub();
	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(
				transactions,
				'createSignatureObject',
				sandbox.stub().returns(defaultSignatureObject),
			)
			.stub(transactions, 'utils', {
				validateTransaction: sandbox.stub().returns({ valid: true }),
			})
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
			.stub(transactions, 'utils', {
				validateTransaction: sandbox.stub().returns({ valid: false }),
			})
			.command(['signature:create', JSON.stringify(defaultTransaction)])
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
				expect(transactions.createSignatureObject).to.be.calledWithExactly(
					defaultTransaction,
					defaultInputs.passphrase,
				);
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
					expect(transactions.createSignatureObject).to.be.calledWithExactly(
						defaultTransaction,
						defaultInputs.passphrase,
					);
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
					expect(transactions.createSignatureObject).to.be.calledWithExactly(
						defaultTransaction,
						defaultInputs.passphrase,
					);
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
					expect(transactions.createSignatureObject).to.be.calledWithExactly(
						defaultTransaction,
						defaultInputs.passphrase,
					);
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSignatureObject,
					);
				},
			);
	});
});
