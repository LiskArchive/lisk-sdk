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

describe('delegate:votes', () => {
	const endpoint = 'votes';
	const apiConfig = {
		nodes: ['http://local.host'],
		network: 'main',
	};
	const defaultQuery = {
		limit: 10,
		offset: 0,
		sort: 'balance:desc',
	};
	const printMethodStub = sandbox.stub();
	const apiClientStub = sandbox.stub();
	const addresses = ['13133549779353512613L', '16010222169256538112L'];
	const queryResult = [
		{
			address: addresses[0],
			balance: '0',
			publicKey:
				'0a47b151eafe8cfc278721ba14305071cae727395abf4c00bd298296c851dab9',
			votes: [
				{
					balance: '999999999999',
					username: 'mitsujutsu',
					publicKey:
						'e7cz206a33d0f019d9d030c2e34870767d8994680e7b10ebdaf2af0e59332524',
					address: '1721671824473341641L',
				},
			],
			votesUsed: 101,
			votesAvailable: 0,
		},
	];
	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({ api: apiConfig }))
			.stub(apiUtils, 'getAPIClient', sandbox.stub().returns(apiClientStub))
			.stdout();

	describe('delegate:votes', () => {
		setupTest()
			.command(['delegate:votes'])
			.catch((error: Error) => {
				return expect(error.message).to.contain('Missing 1 required arg');
			})
			.it('should throw an error when arg is not provided');

		describe('delegate:votes account', () => {
			setupTest()
				.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
				.command(['delegate:votes', addresses[0]])
				.it('should get account votes and display as an array', () => {
					expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
					expect(queryHandler.query).to.be.calledWithExactly(
						apiClientStub,
						endpoint,
						[
							{
								query: {
									address: addresses[0],
									...defaultQuery,
								},
								placeholder: {
									address: addresses[0],
									message: 'Account not found.',
								},
							},
						],
					);
					return expect(printMethodStub).to.be.calledWithExactly(queryResult);
				});
		});

		describe('delegate:votes accounts', () => {
			const addressesWithEmpty = ['13133549779353512613L', ''];

			setupTest()
				.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
				.command(['delegate:votes', addresses.join(',')])
				.it('should get account votes and display as an array', () => {
					expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
					expect(queryHandler.query).to.be.calledWithExactly(
						apiClientStub,
						endpoint,
						[
							{
								query: {
									address: addresses[0],
									...defaultQuery,
								},
								placeholder: {
									address: addresses[0],
									message: 'Account not found.',
								},
							},
							{
								query: {
									address: addresses[1],
									...defaultQuery,
								},
								placeholder: {
									address: addresses[1],
									message: 'Account not found.',
								},
							},
						],
					);
					return expect(printMethodStub).to.be.calledWithExactly(queryResult);
				});

			setupTest()
				.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
				.command(['delegate:votes', addressesWithEmpty.join(',')])
				.it(
					'should get account votes only using non-empty args and display as an array',
					() => {
						expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
						expect(queryHandler.query).to.be.calledWithExactly(
							apiClientStub,
							endpoint,
							[
								{
									query: {
										address: addressesWithEmpty[0],
										...defaultQuery,
									},
									placeholder: {
										address: addressesWithEmpty[0],
										message: 'Account not found.',
									},
								},
							],
						);
						return expect(printMethodStub).to.be.calledWithExactly(queryResult);
					},
				);
		});

		describe('delegate:votes --limit=xxx', () => {
			setupTest()
				.command(['delegate:votes', addresses[0], '--limit=wronglimit'])
				.catch((error: Error) => {
					return expect(error.message).to.contain(
						'Limit must be an integer and greater than 0',
					);
				})
				.it('should throw an error when limit is not a valid integer');

			setupTest()
				.command(['delegate:votes', addresses[0], '--limit=0'])
				.catch((error: Error) => {
					return expect(error.message).to.contain(
						'Limit must be an integer and greater than 0',
					);
				})
				.it('should throw an error when limit is 0');

			setupTest()
				.command(['delegate:votes', addresses[0], '--limit=101'])
				.catch((error: Error) => {
					return expect(error.message).to.contain(
						'Maximum limit amount is 100',
					);
				})
				.it('should throw an error when limit is greater than 100');

			setupTest()
				.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
				.command(['delegate:votes', addresses[0], '--limit=3'])
				.it('should get votes for account with limit', () => {
					expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
					expect(queryHandler.query).to.be.calledWithExactly(
						apiClientStub,
						endpoint,
						[
							{
								query: {
									address: addresses[0],
									limit: 3,
									offset: 0,
									sort: 'balance:desc',
								},
								placeholder: {
									address: addresses[0],
									message: 'Account not found.',
								},
							},
						],
					);

					return expect(printMethodStub).to.be.calledWithExactly(queryResult);
				});
		});

		describe('delegate:votes --offset=xxx', () => {
			setupTest()
				.command(['delegate:votes', addresses[0], '--offset=wrongoffset'])
				.catch((error: Error) => {
					return expect(error.message).to.contain(
						'Offset must be an integer and greater than or equal to 0',
					);
				})
				.it('should throw an error when offset is not a valid integer');

			setupTest()
				.command(['delegate:votes', addresses[0], '--offset=-1'])
				.catch((error: Error) => {
					return expect(error.message).to.contain(
						'Offset must be an integer and greater than or equal to 0',
					);
				})
				.it('should throw an error when offset is an integer less than 0');

			setupTest()
				.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
				.command(['delegate:votes', addresses[0], '--offset=1'])
				.it('should get votes for account with offset', () => {
					expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
					expect(queryHandler.query).to.be.calledWithExactly(
						apiClientStub,
						endpoint,
						[
							{
								query: {
									address: addresses[0],
									limit: 10,
									offset: 1,
									sort: 'balance:desc',
								},
								placeholder: {
									address: addresses[0],
									message: 'Account not found.',
								},
							},
						],
					);

					return expect(printMethodStub).to.be.calledWithExactly(queryResult);
				});
		});

		describe('delegate:votes --sort=xxx', () => {
			setupTest()
				.command(['delegate:votes', addresses[0], '--sort=wrongsort'])
				.catch((error: Error) => {
					return expect(error.message).to.contain(
						'Sort must be one of: balance:asc, balance:desc, username:asc, username:desc',
					);
				})
				.it('should throw an error when given incorrect sort input');

			setupTest()
				.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
				.command(['delegate:votes', addresses[0], '--sort=balance:asc'])
				.it('should get sorted votes for account', () => {
					expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
					expect(queryHandler.query).to.be.calledWithExactly(
						apiClientStub,
						endpoint,
						[
							{
								query: {
									address: addresses[0],
									limit: 10,
									offset: 0,
									sort: 'balance:asc',
								},
								placeholder: {
									address: addresses[0],
									message: 'Account not found.',
								},
							},
						],
					);

					return expect(printMethodStub).to.be.calledWithExactly(queryResult);
				});
		});
	});
});
