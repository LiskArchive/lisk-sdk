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
	const defaultParameter = {
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
			query(apiClient, defaultEndpoint, defaultParameter);
			return Promise.resolve();
		});

		it('it should call API client', () => {
			return expect(apiClient.accounts.get).to.be.calledWithExactly(
				defaultParameter,
			);
		});

		it('it should thrown an error', () => {
			return expect(
				query(apiClient, defaultEndpoint, defaultParameter),
			).to.be.rejectedWith(Error, 'No data was returned.');
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
			return Promise.resolve();
		});

		it('it should call API client', () => {
			query(apiClient, defaultEndpoint, defaultParameter);
			return expect(apiClient.accounts.get).to.be.calledWithExactly(
				defaultParameter,
			);
		});

		it('it should thrown an error', () => {
			return expect(
				query(apiClient, defaultEndpoint, defaultParameter),
			).to.be.rejectedWith(
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
			return Promise.resolve();
		});

		it('it should call API client', () => {
			query(apiClient, defaultEndpoint, defaultParameter);
			return expect(apiClient.accounts.get).to.be.calledWithExactly(
				defaultParameter,
			);
		});

		it('it should resolve to an object', () => {
			return expect(
				query(apiClient, defaultEndpoint, defaultParameter),
			).to.eventually.eql(response.data[0]);
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
			return Promise.resolve();
		});

		it('it should call API client', () => {
			query(apiClient, defaultEndpoint, defaultParameter);
			return expect(apiClient.accounts.get).to.be.calledWithExactly(
				defaultParameter,
			);
		});

		it('it should resolve to an object', () => {
			return expect(
				query(apiClient, defaultEndpoint, defaultParameter),
			).to.eventually.eql(response.data);
		});
	});

	describe('when the parameter is an array', () => {
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

		it('it should call API client', () => {
			defaultArrayParameters.forEach(param =>
				expect(apiClient.accounts.get).to.be.calledWithExactly(param),
			);
			return Promise.resolve();
		});
	});
});
