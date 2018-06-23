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
// Require for stubbing
const getAPIClient = require('../../src/utils/api');

describe('query utils', () => {
	const defaultEndpoint = 'accounts';
	const defaultParameter = 'address1';

	let response;
	let apiClient;
	describe('when the response does not have data', () => {
		beforeEach(() => {
			response = {
				no: 'data',
			};
			sandbox.stub(getAPIClient, 'default').returns({
				accounts: {
					get: sandbox.stub().resolves(response),
				},
			});
			apiClient = getAPIClient.default();
			query(defaultEndpoint, defaultParameter);
			return Promise.resolve();
		});

		it('it should call API client', () => {
			return expect(apiClient.accounts.get).to.be.calledWithExactly(
				defaultParameter,
			);
		});

		it('it should thrown an error', () => {
			return expect(
				query(defaultEndpoint, defaultParameter),
			).to.be.rejectedWith(Error, 'No data was returned.');
		});
	});

	describe('when the response is an empty array', () => {
		beforeEach(() => {
			response = {
				data: [],
			};
			sandbox.stub(getAPIClient, 'default').returns({
				accounts: {
					get: sandbox.stub().resolves(response),
				},
			});
			apiClient = getAPIClient.default();
			return Promise.resolve();
		});

		it('it should call API client', () => {
			query(defaultEndpoint, defaultParameter);
			return expect(apiClient.accounts.get).to.be.calledWithExactly(
				defaultParameter,
			);
		});

		it('it should thrown an error', () => {
			return expect(
				query(defaultEndpoint, defaultParameter),
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
			sandbox.stub(getAPIClient, 'default').returns({
				accounts: {
					get: sandbox.stub().resolves(response),
				},
			});
			apiClient = getAPIClient.default();
			return Promise.resolve();
		});

		it('it should call API client', () => {
			query(defaultEndpoint, defaultParameter);
			return expect(apiClient.accounts.get).to.be.calledWithExactly(
				defaultParameter,
			);
		});

		it('it should resolve to an object', () => {
			return expect(query(defaultEndpoint, defaultParameter)).to.eventually.eql(
				response.data[0],
			);
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
			sandbox.stub(getAPIClient, 'default').returns({
				accounts: {
					get: sandbox.stub().resolves(response),
				},
			});
			apiClient = getAPIClient.default();
			return Promise.resolve();
		});

		it('it should call API client', () => {
			query(defaultEndpoint, defaultParameter);
			return expect(apiClient.accounts.get).to.be.calledWithExactly(
				defaultParameter,
			);
		});

		it('it should resolve to an object', () => {
			return expect(query(defaultEndpoint, defaultParameter)).to.eventually.eql(
				response.data,
			);
		});
	});
});
