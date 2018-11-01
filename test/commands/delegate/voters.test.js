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
import { expect, test } from '@oclif/test';
import * as config from '../../../src/utils/config';
import * as print from '../../../src/utils/print';
import * as api from '../../../src/utils/api';
import * as query from '../../../src/utils/query';

describe('delegate:voters', () => {
	const endpoint = 'voters';
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
	const usernames = ['genesis_5', 'genesis_6'];
	const queryResult = [
		{
			username: usernames[0],
			balance: '0',
			publicKey:
				'0a47b151eafe8cfc278721ba14305071cae727395abf4c00bd298296c851dab9',
			address: '10730473708113756935L',
			voters: [
				{
					address: '17534106505153007102L',
					balance: '370400962539',
					publicKey:
						'e2281b7bb0e7cd51cc5ac49d9463c6a1640aac20ae9baa9333ddc92a5ad63e42',
				},
			],
			votes: 47,
		},
	];
	const setupTest = () =>
		test
			.stub(print, 'default', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({ api: apiConfig }))
			.stub(api, 'default', sandbox.stub().returns(apiClientStub))
			.stdout();

	describe('delegate:voters', () => {
		setupTest()
			.stdout()
			.command(['delegate:voters'])
			.catch(error => {
				return expect(error.message).to.contain('Missing 1 required arg');
			})
			.it('should throw an error when arg is not provided');

		describe('delegate:voters delegate', () => {
			setupTest()
				.stdout()
				.stub(query, 'default', sandbox.stub().resolves(queryResult))
				.command(['delegate:voters', usernames[0]])
				.it('should get delegate voters and display as an array', () => {
					expect(api.default).to.be.calledWithExactly(apiConfig);
					expect(query.default).to.be.calledWithExactly(
						apiClientStub,
						endpoint,
						[
							{
								query: {
									username: usernames[0],
									...defaultQuery,
								},
								placeholder: {
									username: usernames[0],
									message: 'Delegate not found.',
								},
							},
						],
					);
					return expect(printMethodStub).to.be.calledWithExactly(queryResult);
				});
		});

		describe('delegate:voters delegates', () => {
			const usernamesWithEmpty = ['genesis_4', ''];

			setupTest()
				.stdout()
				.stub(query, 'default', sandbox.stub().resolves(queryResult))
				.command(['delegate:voters', usernames.join(',')])
				.it('should get delegates voters and display as an array', () => {
					expect(api.default).to.be.calledWithExactly(apiConfig);
					expect(query.default).to.be.calledWithExactly(
						apiClientStub,
						endpoint,
						[
							{
								query: {
									username: usernames[0],
									...defaultQuery,
								},
								placeholder: {
									username: usernames[0],
									message: 'Delegate not found.',
								},
							},
							{
								query: {
									username: usernames[1],
									...defaultQuery,
								},
								placeholder: {
									username: usernames[1],
									message: 'Delegate not found.',
								},
							},
						],
					);
					return expect(printMethodStub).to.be.calledWithExactly(queryResult);
				});

			setupTest()
				.stdout()
				.stub(query, 'default', sandbox.stub().resolves(queryResult))
				.command(['delegate:voters', usernamesWithEmpty.join(',')])
				.it(
					'should get delegates voters only using non-empty args and display as an array',
					() => {
						expect(api.default).to.be.calledWithExactly(apiConfig);
						expect(query.default).to.be.calledWithExactly(
							apiClientStub,
							endpoint,
							[
								{
									query: {
										username: usernamesWithEmpty[0],
										...defaultQuery,
									},
									placeholder: {
										username: usernamesWithEmpty[0],
										message: 'Delegate not found.',
									},
								},
							],
						);
						return expect(printMethodStub).to.be.calledWithExactly(queryResult);
					},
				);
		});

		describe('delegate:voters --limit=xxx', () => {
			setupTest()
				.command(['delegate:voters', usernames[0], '--limit=wronglimit'])
				.catch(error => {
					return expect(error.message).to.contain(
						'Limit must be an integer and greater than 0',
					);
				})
				.it('should throw an error when limit is not a valid integer');

			setupTest()
				.command(['delegate:voters', usernames[0], '--limit=0'])
				.catch(error => {
					return expect(error.message).to.contain(
						'Limit must be an integer and greater than 0',
					);
				})
				.it('should throw an error when limit is 0');

			setupTest()
				.command(['delegate:voters', usernames[0], '--limit=101'])
				.catch(error => {
					return expect(error.message).to.contain(
						'Maximum limit amount is 100',
					);
				})
				.it('should throw an error when limit is greater than 100');

			setupTest()
				.stdout()
				.stub(query, 'default', sandbox.stub().resolves(queryResult))
				.command(['delegate:voters', usernames[0], '--limit=3'])
				.it('should get voters for delegate with limit', () => {
					expect(api.default).to.be.calledWithExactly(apiConfig);
					expect(query.default).to.be.calledWithExactly(
						apiClientStub,
						endpoint,
						[
							{
								query: {
									username: usernames[0],
									limit: 3,
									offset: 0,
									sort: 'balance:desc',
								},
								placeholder: {
									username: usernames[0],
									message: 'Delegate not found.',
								},
							},
						],
					);

					return expect(printMethodStub).to.be.calledWithExactly(queryResult);
				});
		});

		describe('delegate:voters --offset=xxx', () => {
			setupTest()
				.command(['delegate:voters', usernames[0], '--offset=wrongoffset'])
				.catch(error => {
					return expect(error.message).to.contain(
						'Offset must be an integer and greater than or equal to 0',
					);
				})
				.it('should throw an error when offset is not a valid integer');

			setupTest()
				.command(['delegate:voters', usernames[0], '--offset=-1'])
				.catch(error => {
					return expect(error.message).to.contain(
						'Offset must be an integer and greater than or equal to 0',
					);
				})
				.it('should throw an error when offset is an integer less than 0');

			setupTest()
				.stdout()
				.stub(query, 'default', sandbox.stub().resolves(queryResult))
				.command(['delegate:voters', usernames[0], '--offset=1'])
				.it('should get voters for delegate with offset', () => {
					expect(api.default).to.be.calledWithExactly(apiConfig);
					expect(query.default).to.be.calledWithExactly(
						apiClientStub,
						endpoint,
						[
							{
								query: {
									username: usernames[0],
									limit: 10,
									offset: 1,
									sort: 'balance:desc',
								},
								placeholder: {
									username: usernames[0],
									message: 'Delegate not found.',
								},
							},
						],
					);

					return expect(printMethodStub).to.be.calledWithExactly(queryResult);
				});
		});

		describe('delegate:voters --sort=xxx', () => {
			setupTest()
				.command(['delegate:voters', usernames[0], '--sort=wrongsort'])
				.catch(error => {
					return expect(error.message).to.contain(
						'Sort must be one of: publicKey:asc, publicKey:desc, balance:asc, balance:desc, username:asc, username:desc',
					);
				})
				.it('should throw an error when given incorrect sort input');

			setupTest()
				.stdout()
				.stub(query, 'default', sandbox.stub().resolves(queryResult))
				.command(['delegate:voters', usernames[0], '--sort=publicKey:asc'])
				.it('should get sorted voters for delegate', () => {
					expect(api.default).to.be.calledWithExactly(apiConfig);
					expect(query.default).to.be.calledWithExactly(
						apiClientStub,
						endpoint,
						[
							{
								query: {
									username: usernames[0],
									limit: 10,
									offset: 0,
									sort: 'publicKey:asc',
								},
								placeholder: {
									username: usernames[0],
									message: 'Delegate not found.',
								},
							},
						],
					);

					return expect(printMethodStub).to.be.calledWithExactly(queryResult);
				});
		});
	});
});
