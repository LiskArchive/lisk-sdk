/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import { test } from '@oclif/test';
import * as config from '../../../src/utils/config';
import * as print from '../../../src/utils/print';
import * as api from '../../../src/utils/api';
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
			.stub(print, 'default', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({ api: apiConfig }))
			.stdout();

	describe('transaction:get transaction', () => {
		const transactionId = '3520445367460290306';
		const queryResult = {
			id: transactionId,
			type: 2,
		};

		setupTest()
			.stub(api, 'default', sandbox.stub().returns(apiClientStub))
			.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
			.command(['transaction:get', transactionId])
			.it('should get a transaction’s info and display as an array', () => {
				expect(api.default).to.be.calledWithExactly(apiConfig);
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
			.stub(api, 'default', sandbox.stub().returns(apiClientStub))
			.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
			.command(['transaction:get', transactionIds.join(',')])
			.it('should get two transactions’ info and display as an array', () => {
				expect(api.default).to.be.calledWithExactly(apiConfig);
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
			.stub(api, 'default', sandbox.stub().returns(apiClientStub))
			.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
			.command(['transaction:get', transactionIdsWithEmpty.join(',')])
			.it(
				'should get transactions info only using non-empty args and display as an array',
				() => {
					expect(api.default).to.be.calledWithExactly(apiConfig);
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
		describe('transaction: get --sender-id', () => {
			setupTest()
				.stub(api, 'default', sandbox.stub().returns(apiClientStub))
				.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
				.command(['transaction:get', '--sender-id=12668885769632475474L'])
				.it('should get all transactions info limited by limit value', () => {
					expect(api.default).to.be.calledWithExactly(apiConfig);
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
				.stub(api, 'default', sandbox.stub().returns(apiClientStub))
				.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
				.command(['transaction:get', '--limit=10'])
				.it('should get all transactions info limited by limit value', () => {
					expect(api.default).to.be.calledWithExactly(apiConfig);
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
				.stub(api, 'default', sandbox.stub().returns(apiClientStub))
				.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
				.command(['transaction:get'])
				.it(
					'should get all transactions based on default value of limit(20) and offset(0).',
					() => {
						expect(api.default).to.be.calledWithExactly(apiConfig);
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
				.stub(api, 'default', sandbox.stub().returns(apiClientStub))
				.stub(
					queryHandler,
					'query',
					sandbox.stub().resolves({ message: 'No transactions found.' }),
				)
				.command(['transaction:get', '--offset=10'])
				.it('should return a message with no transactions found.', () => {
					expect(api.default).to.be.calledWithExactly(apiConfig);
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
				});
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
			.stub(api, 'default', sandbox.stub().returns(apiClientStubNode))
			.command(['transaction:get', '--state=unsign', '--offset=1'])
			.catch(error => {
				return expect(error.message).to.contain(
					'to be one of: unsigned, unprocessed',
				);
			})
			.it('should throw an error when incorrect value of state is provided');

		describe('transaction: get transactions --state=unprocessed', () => {
			setupTest()
				.stub(api, 'default', sandbox.stub().returns(apiClientStubNode))
				.command(['transaction:get', transactionId, '--state=unprocessed'])
				.it(
					'should get a transaction’s info and display as an array for a state.',
					() => {
						expect(api.default).to.be.calledWithExactly(apiConfig);
						return expect(printMethodStub).to.be.calledWithExactly([
							defaultGetTransactionsResponse.data,
						]);
					},
				);

			setupTest()
				.stub(api, 'default', sandbox.stub().returns(apiClientStubNode))
				.command([
					'transaction:get',
					transactionIdsWithEmpty.join(','),
					'--state=unsigned',
				])
				.it(
					'should get transaction’s info and display as an array for a state.',
					() => {
						expect(api.default).to.be.calledWithExactly(apiConfig);
						return expect(printMethodStub).to.be.calledWithExactly([
							defaultGetTransactionsResponse.data,
						]);
					},
				);
		});

		describe('transaction: get --state-unsigned --sender-id', () => {
			setupTest()
				.stub(api, 'default', sandbox.stub().returns(apiClientStubNode))
				.command([
					'transaction:get',
					'--sender-id=12668885769632475474L',
					'--state=unprocessed',
				])
				.it(
					'should get a transaction’s info for a given senders address and state and display as an array.',
					() => {
						expect(api.default).to.be.calledWithExactly(apiConfig);
						return expect(printMethodStub).to.be.calledWithExactly([
							defaultGetTransactionsResponse.data,
						]);
					},
				);

			setupTest()
				.stub(api, 'default', sandbox.stub().returns(apiClientStubNode))
				.command([
					'transaction:get',
					'3520445367460290306',
					'--sender-id=12668885769632475474L',
					'--state=unprocessed',
				])
				.it(
					'should get a transaction’s info for a given txn Id, senders address and state and display as an array.',
					() => {
						expect(api.default).to.be.calledWithExactly(apiConfig);
						return expect(printMethodStub).to.be.calledWithExactly([
							defaultGetTransactionsResponse.data,
						]);
					},
				);

			setupTest()
				.stub(api, 'default', sandbox.stub().returns(apiClientStubNode))
				.command(['transaction:get', '--state=unprocessed', '--limit=10'])
				.it(
					'should get transactions for a given state taking limit or offset or default.',
					() => {
						expect(api.default).to.be.calledWithExactly(apiConfig);
						return expect(printMethodStub).to.be.calledWithExactly([
							defaultGetTransactionsResponse.data,
						]);
					},
				);
		});
	});
});
