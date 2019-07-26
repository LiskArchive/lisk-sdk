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
import * as apiUtils from '../../../src/utils/api';
import * as queryHandler from '../../../src/utils/query';

describe('transaction:get', () => {
	const endpoint = 'transactions';
	const apiConfig = {
		nodes: ['http://local.host'],
		network: 'main',
	};
	const printMethodStub = sandbox.stub();
	const apiClientStub = sandbox.stub();
	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({ api: apiConfig }))
			.stdout();

	describe('transaction:get transaction', () => {
		const transactionId = '3520445367460290306';
		const queryResult = {
			id: transactionId,
			type: 2,
		};

		setupTest()
			.stub(apiUtils, 'getAPIClient', sandbox.stub().returns(apiClientStub))
			.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
			.command(['transaction:get', transactionId])
			.it('should get a transaction’s info and display as an array', () => {
				expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
				expect(queryHandler.query).to.be.calledWithExactly(
					apiClientStub,
					endpoint,
					[
						{
							query: {
								limit: 1,
								id: transactionId,
							},
							placeholder: {
								id: transactionId,
								message: 'Transaction not found.',
							},
						},
					],
				);
				return expect(printMethodStub).to.be.calledWithExactly(queryResult);
			});
	});

	describe('transaction:get transactions', () => {
		const transactionIds = ['3520445367460290306', '2802325248134221536'];
		const transactionIdsWithEmpty = [
			'3520445367460290306',
			'',
			'2802325248134221536',
		];
		const queryResult = [
			{
				id: transactionIds[0],
				type: 0,
				height: 105,
			},
			{
				id: transactionIds[1],
				type: 3,
				height: 1010,
			},
		];

		setupTest()
			.stub(apiUtils, 'getAPIClient', sandbox.stub().returns(apiClientStub))
			.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
			.command(['transaction:get', transactionIds.join(',')])
			.it('should get two transaction’s info and display as an array.', () => {
				expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
				expect(queryHandler.query).to.be.calledWithExactly(
					apiClientStub,
					endpoint,
					[
						{
							query: {
								limit: 1,
								id: transactionIds[0],
							},
							placeholder: {
								id: transactionIds[0],
								message: 'Transaction not found.',
							},
						},
						{
							query: {
								limit: 1,
								id: transactionIds[1],
							},
							placeholder: {
								id: transactionIds[1],
								message: 'Transaction not found.',
							},
						},
					],
				);
				return expect(printMethodStub).to.be.calledWithExactly(queryResult);
			});

		setupTest()
			.stub(apiUtils, 'getAPIClient', sandbox.stub().returns(apiClientStub))
			.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
			.command(['transaction:get', transactionIdsWithEmpty.join(',')])
			.it(
				'should get transaction’s info only using non-empty args and display as an array.',
				() => {
					expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
					expect(queryHandler.query).to.be.calledWithExactly(
						apiClientStub,
						endpoint,
						[
							{
								query: {
									limit: 1,
									id: transactionIdsWithEmpty[0],
								},
								placeholder: {
									id: transactionIdsWithEmpty[0],
									message: 'Transaction not found.',
								},
							},
							{
								query: {
									limit: 1,
									id: transactionIdsWithEmpty[2],
								},
								placeholder: {
									id: transactionIdsWithEmpty[2],
									message: 'Transaction not found.',
								},
							},
						],
					);
					return expect(printMethodStub).to.be.calledWithExactly(queryResult);
				},
			);

		describe('transaction:get --sender-id', () => {
			setupTest()
				.stub(apiUtils, 'getAPIClient', sandbox.stub().returns(apiClientStub))
				.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
				.command(['transaction:get', '--sender-id=12668885769632475474L'])
				.it('should get all transactions for a given sender-id.', () => {
					expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
					expect(queryHandler.query).to.be.calledWithExactly(
						apiClientStub,
						endpoint,
						{
							query: {
								limit: '10',
								offset: '0',
								senderId: '12668885769632475474L',
								sort: 'timestamp:desc',
							},
							placeholder: {
								message: 'No transactions found.',
							},
						},
					);
					return expect(printMethodStub).to.be.calledWithExactly(queryResult);
				});
		});

		describe('transaction: get --limit --offset', () => {
			setupTest()
				.stub(apiUtils, 'getAPIClient', sandbox.stub().returns(apiClientStub))
				.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
				.command(['transaction:get', '--limit=10'])
				.it('should get all transactions info limited by limit value.', () => {
					expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
					expect(queryHandler.query).to.be.calledWithExactly(
						apiClientStub,
						endpoint,
						{
							query: {
								limit: '10',
								offset: '0',
								sort: 'timestamp:desc',
							},
							placeholder: {
								message: 'No transactions found.',
							},
						},
					);
					return expect(printMethodStub).to.be.calledWithExactly(queryResult);
				});

			setupTest()
				.stub(apiUtils, 'getAPIClient', sandbox.stub().returns(apiClientStub))
				.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
				.command(['transaction:get'])
				.it(
					'should get all transactions based on default value of limit(10) and offset(0).',
					() => {
						expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
						expect(queryHandler.query).to.be.calledWithExactly(
							apiClientStub,
							endpoint,
							{
								query: {
									limit: '10',
									offset: '0',
									sort: 'timestamp:desc',
								},
								placeholder: {
									message: 'No transactions found.',
								},
							},
						);
						return expect(printMethodStub).to.be.calledWithExactly(queryResult);
					},
				);

			setupTest()
				.stub(apiUtils, 'getAPIClient', sandbox.stub().returns(apiClientStub))
				.stub(
					queryHandler,
					'query',
					sandbox.stub().resolves({ message: 'No transactions found.' }),
				)
				.command(['transaction:get', '--offset=10'])
				.it(
					'should return a message that no transactions found when there are no transactions after a given offset value.',
					() => {
						expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
						expect(queryHandler.query).to.be.calledWithExactly(
							apiClientStub,
							endpoint,
							{
								query: {
									limit: '10',
									offset: '10',
									sort: 'timestamp:desc',
								},
								placeholder: {
									message: 'No transactions found.',
								},
							},
						);
						return expect(printMethodStub).to.be.calledWithExactly({
							message: 'No transactions found.',
						});
					},
				);
		});
	});

	describe('transaction:get transactions --state', () => {
		const transactionId = '3520445367460290306';
		const transactionIds = ['3520445367460290306', '2802325248134221536'];
		const transactionIdsWithEmpty = [
			'3520445367460290306',
			'',
			'2802325248134221536',
		];

		const defaultGetTransactionsResponse = {
			data: [
				{
					id: transactionIds[0],
					type: 0,
				},
				{
					id: transactionIds[1],
					type: 3,
				},
			],
		};
		const apiClientStubNode = {
			node: {
				getTransactions: sandbox
					.stub()
					.resolves(defaultGetTransactionsResponse),
			},
		};

		setupTest()
			.stub(apiUtils, 'getAPIClient', sandbox.stub().returns(apiClientStubNode))
			.command(['transaction:get', '--state=unsign', '--offset=1'])
			.catch(error => {
				return expect(error.message).to.contain(
					'to be one of: unsigned, unprocessed',
				);
			})
			.it('should throw an error when incorrect value of state is provided');

		describe('transaction:get transaction --state=unprocessed', () => {
			const singleTransactionsResponse = {
				data: [
					{
						id: transactionIds[0],
						type: 0,
					},
				],
			};
			const localClientStub = {
				node: {
					getTransactions: sandbox.stub().resolves(singleTransactionsResponse),
				},
			};

			setupTest()
				.stub(apiUtils, 'getAPIClient', sandbox.stub().returns(localClientStub))
				.stub(
					queryHandler,
					'queryNodeTransaction',
					sandbox.stub().resolves(singleTransactionsResponse.data),
				)
				.command(['transaction:get', transactionId, '--state=unprocessed'])
				.it(
					'should get an unprocessed transaction’s info by Id and display as an array.',
					() => {
						expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
						expect(queryHandler.queryNodeTransaction).to.be.calledWithExactly(
							localClientStub.node,
							'unprocessed',
							[
								{
									query: {
										id: '3520445367460290306',
										limit: 1,
									},
									placeholder: {
										id: '3520445367460290306',
										message: 'Transaction not found.',
									},
								},
							],
						);
						return expect(printMethodStub).to.be.calledWithExactly(
							singleTransactionsResponse.data,
						);
					},
				);
		});

		describe('transaction:get transactions --state=unprocessed', () => {
			setupTest()
				.stub(
					apiUtils,
					'getAPIClient',
					sandbox.stub().returns(apiClientStubNode),
				)
				.stub(
					queryHandler,
					'queryNodeTransaction',
					sandbox.stub().resolves(defaultGetTransactionsResponse.data),
				)
				.command([
					'transaction:get',
					transactionIdsWithEmpty.join(','),
					'--state=unsigned',
				])
				.it(
					'should get transaction’s info for given ids and unsigned state.',
					() => {
						expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
						expect(queryHandler.queryNodeTransaction).to.be.calledWithExactly(
							apiClientStubNode.node,
							'unsigned',
							[
								{
									query: {
										id: '3520445367460290306',
										limit: 1,
									},
									placeholder: {
										id: '3520445367460290306',
										message: 'Transaction not found.',
									},
								},
								{
									query: {
										id: '2802325248134221536',
										limit: 1,
									},
									placeholder: {
										id: '2802325248134221536',
										message: 'Transaction not found.',
									},
								},
							],
						);
						return expect(printMethodStub).to.be.calledWithExactly(
							defaultGetTransactionsResponse.data,
						);
					},
				);
		});

		describe('transaction:get --state-unsigned --sender-id', () => {
			const senderTransactionsResponse = {
				data: [
					{
						id: transactionIds[0],
						senderId: '12668885769632475474L',
						type: 0,
					},
				],
			};

			const clientStubNode = {
				node: {
					getTransactions: sandbox.stub().resolves(senderTransactionsResponse),
				},
			};

			setupTest()
				.stub(apiUtils, 'getAPIClient', sandbox.stub().returns(clientStubNode))
				.stub(
					queryHandler,
					'queryNodeTransaction',
					sandbox.stub().resolves(senderTransactionsResponse.data),
				)
				.command([
					'transaction:get',
					'--sender-id=12668885769632475474L',
					'--state=unprocessed',
				])
				.it(
					'should get a transaction’s info for a given sender’s address and state and display as an array.',
					() => {
						expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
						expect(queryHandler.queryNodeTransaction).to.be.calledWithExactly(
							clientStubNode.node,
							'unprocessed',
							[
								{
									query: {
										limit: '10',
										offset: '0',
										senderId: '12668885769632475474L',
										sort: 'timestamp:desc',
									},
									placeholder: {
										senderId: '12668885769632475474L',
										message: 'Transaction not found.',
									},
								},
							],
						);
						return expect(printMethodStub).to.be.calledWithExactly(
							senderTransactionsResponse.data,
						);
					},
				);

			setupTest()
				.stub(apiUtils, 'getAPIClient', sandbox.stub().returns(clientStubNode))
				.stub(
					queryHandler,
					'queryNodeTransaction',
					sandbox.stub().resolves(senderTransactionsResponse),
				)
				.command([
					'transaction:get',
					'3520445367460290306',
					'--sender-id=12668885769632475474L',
					'--state=unprocessed',
				])
				.it(
					'should get a transaction’s info for a given txn Id, sender’s address and state and display as an array.',
					() => {
						expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
						expect(queryHandler.queryNodeTransaction).to.be.calledWithExactly(
							clientStubNode.node,
							'unprocessed',
							[
								{
									query: {
										limit: 1,
										id: '3520445367460290306',
										senderId: '12668885769632475474L',
									},
									placeholder: {
										senderId: '12668885769632475474L',
										id: '3520445367460290306',
										message: 'Transaction not found.',
									},
								},
							],
						);
						return expect(printMethodStub).to.be.calledWithExactly(
							senderTransactionsResponse.data,
						);
					},
				);

			describe('transaction:get --state-unprocessed', () => {
				const stateTransactionsResponse = {
					data: [
						{
							id: transactionIds[0],
							type: 0,
						},
					],
				};

				const localClientStub = {
					node: {
						getTransactions: sandbox.stub().resolves(stateTransactionsResponse),
					},
				};

				setupTest()
					.stub(
						apiUtils,
						'getAPIClient',
						sandbox.stub().returns(localClientStub),
					)
					.stub(
						queryHandler,
						'queryNodeTransaction',
						sandbox.stub().resolves(stateTransactionsResponse.data),
					)
					.command(['transaction:get', '--state=unprocessed', '--limit=50'])
					.it(
						'should get transactions for a given state without specified txn id and limited by limit flag.',
						() => {
							expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
							expect(queryHandler.queryNodeTransaction).to.be.calledWithExactly(
								localClientStub.node,
								'unprocessed',
								[
									{
										query: {
											limit: '50',
											offset: '0',
											sort: 'timestamp:desc',
										},
										placeholder: {
											message: 'No transactions found.',
										},
									},
								],
							);
							return expect(printMethodStub).to.be.calledWithExactly(
								defaultGetTransactionsResponse.data,
							);
						},
					);
			});
		});
	});
});
