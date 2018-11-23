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
import { expect } from 'chai';
import { query } from '../../src/utils/query';
import { APIClient } from '@liskhq/lisk-api-client';
import { ApiResponse } from '@liskhq/lisk-api-client/dist-node/api_types';

describe('query utils', () => {
	const defaultEndpoint = 'accounts';
	const defaultParameters = {
		query: {
			address: 'address1',
			limit: 1,
		},
	};
	const defaultArrayParameters = [
		{
			query: {
				address: 'address1',
				limit: 1,
			},
		},
		{
			query: {
				address: 'address2',
				limit: 1,
			},
		},
	];

	interface MockAPIClient {
		readonly accounts: {
			get: () => ApiResponse;
		};
	}

	let apiClient: MockAPIClient;
	let response: {
		readonly data?: unknown;
		readonly no?: string;
	};
	let queryResult: Promise<unknown>;

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
			queryResult = query(
				(apiClient as unknown) as APIClient,
				defaultEndpoint,
				defaultParameters,
			);
			return Promise.resolve();
		});

		it('should call API client and should reject with an error', () => {
			expect(apiClient.accounts.get).to.be.calledWithExactly(
				defaultParameters.query,
			);

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
			return Promise.resolve();
		});

		it('should call API client and should reject with an error', () => {
			queryResult = query(
				(apiClient as unknown) as APIClient,
				defaultEndpoint,
				defaultParameters,
			);
			expect(apiClient.accounts.get).to.be.calledWithExactly(
				defaultParameters.query,
			);

			return expect(queryResult).to.be.rejectedWith(
				Error,
				'No accounts found using specified parameters.',
			);
		});

		it('should call API client and should return placeholder when it is set', () => {
			const placeholder = {
				id: 'default id',
			};
			const paramWithPlaceholder = {
				...defaultParameters,
				placeholder,
			};
			queryResult = query(
				(apiClient as unknown) as APIClient,
				defaultEndpoint,
				paramWithPlaceholder,
			);
			expect(apiClient.accounts.get).to.be.calledWithExactly(
				defaultParameters.query,
			);

			return expect(queryResult).to.be.eventually.equal(placeholder);
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
			queryResult = query(
				(apiClient as unknown) as APIClient,
				defaultEndpoint,
				defaultParameters,
			);
			return Promise.resolve();
		});

		it('should call API client and resolve to an object', () => {
			expect(apiClient.accounts.get).to.be.calledWithExactly(
				defaultParameters.query,
			);
			const resData = response.data as Array<object>;
			return expect(queryResult).to.eventually.eql(resData[0]);
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
			queryResult = query(
				(apiClient as unknown) as APIClient,
				defaultEndpoint,
				defaultParameters,
			);
			return Promise.resolve();
		});

		it('should call API client and resolve to an object', () => {
			expect(apiClient.accounts.get).to.be.calledWithExactly(
				defaultParameters.query,
			);
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
			query(
				(apiClient as unknown) as APIClient,
				defaultEndpoint,
				defaultArrayParameters,
			);
			return Promise.resolve();
		});

		it('should call API client', () => {
			defaultArrayParameters.forEach(param =>
				expect(apiClient.accounts.get).to.be.calledWithExactly(param.query),
			);
			return Promise.resolve();
		});
	});
});
