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
import query from '../../src/utils/query';

describe('query utils', () => {
	const defaultEndpoint = 'accounts';
	const defaultParameters = {
		address: 'address1',
		limit: 1,
	};
	const defaultArrayParameters = [
		{
			address: 'address1',
			limit: 1,
		},
		{
			address: 'address2',
			limit: 1,
		},
	];

	let apiClient;
	let response;
	let queryResult;
	describe('when the response does not have data', () => {
		beforeEach(() => {
			response = {
				no: 'data',
			};
			apiClient = {
				accounts: {
					get: sandbox.stub().resolves(response),
				},
			};
			queryResult = query(apiClient, defaultEndpoint, defaultParameters);
			return Promise.resolve();
		});

		it('should call API client', () => {
			return expect(apiClient.accounts.get).to.be.calledWithExactly(
				defaultParameters,
			);
		});

		it('should reject with an error', () => {
			return expect(queryResult).to.be.rejectedWith(
				Error,
				'No data was returned.',
			);
		});
	});

	describe('when the response is an empty array', () => {
		beforeEach(() => {
			response = {
				data: [],
			};
			apiClient = {
				accounts: {
					get: sandbox.stub().resolves(response),
				},
			};
			queryResult = query(apiClient, defaultEndpoint, defaultParameters);
			return Promise.resolve();
		});

		it('should call API client', () => {
			return expect(apiClient.accounts.get).to.be.calledWithExactly(
				defaultParameters,
			);
		});

		it('should reject with an error', () => {
			return expect(queryResult).to.be.rejectedWith(
				Error,
				'No accounts found using specified parameters.',
			);
		});
	});

	describe('when the response is an array', () => {
		beforeEach(() => {
			response = {
				data: [
					{
						id: 'someid',
						address: 'address',
					},
				],
			};
			apiClient = {
				accounts: {
					get: sandbox.stub().resolves(response),
				},
			};
			queryResult = query(apiClient, defaultEndpoint, defaultParameters);
			return Promise.resolve();
		});

		it('should call API client', () => {
			return expect(apiClient.accounts.get).to.be.calledWithExactly(
				defaultParameters,
			);
		});

		it('should resolve to an object', () => {
			return expect(queryResult).to.eventually.eql(response.data[0]);
		});
	});

	describe('when the response is an object', () => {
		beforeEach(() => {
			response = {
				data: {
					id: 'someid',
					address: 'address',
				},
			};
			apiClient = {
				accounts: {
					get: sandbox.stub().resolves(response),
				},
			};
			queryResult = query(apiClient, defaultEndpoint, defaultParameters);
			return Promise.resolve();
		});

		it('should call API client', () => {
			return expect(apiClient.accounts.get).to.be.calledWithExactly(
				defaultParameters,
			);
		});

		it('should resolve to an object', () => {
			return expect(queryResult).to.eventually.eql(response.data);
		});
	});

	describe('an array of parameters objects is provided', () => {
		beforeEach(() => {
			response = {
				data: [
					{
						id: 'account1',
					},
				],
			};
			apiClient = {
				accounts: {
					get: sandbox.stub().resolves(response),
				},
			};
			query(apiClient, defaultEndpoint, defaultArrayParameters);
			return Promise.resolve();
		});

		it('should call API client', () => {
			defaultArrayParameters.forEach(param =>
				expect(apiClient.accounts.get).to.be.calledWithExactly(param),
			);
			return Promise.resolve();
		});
	});
});
