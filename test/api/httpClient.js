/*
 * Copyright © 2017 Lisk Foundation
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
const popsicle = require('popsicle');
const httpClient = require('../../src/api/httpClient');

describe('HttpClient module', () => {
	const GET = 'GET';
	const POST = 'POST';
	const defaultEndpoint = 'transactions';
	const defaultFullURL = 'http://localhost:8080';
	const mainnetHash =
		'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511';
	const defaultHeader = {
		'Content-Type': 'application/json',
		nethash: mainnetHash,
		broadhash: mainnetHash,
		os: 'lisk-js-api',
		version: '1.0.0',
		minVersion: '>=0.5.0',
		port: '443',
	};
	const defaultRequest = {
		account: 'accountL',
	};

	const sendRequestResult = { success: true, sendRequest: true };

	describe('#toQueryString', () => {
		// eslint-disable-next-line no-underscore-dangle
		const toQueryString = httpClient.__get__('toQueryString');

		it('should create a query string from an object', () => {
			const queryString = toQueryString({
				key1: 'value1',
				key2: 'value2',
				key3: 'value3',
			});
			return queryString.should.be.equal('key1=value1&key2=value2&key3=value3');
		});

		it('should escape invalid special characters', () => {
			const queryString = toQueryString({
				'key:/;?': 'value:/;?',
			});
			return queryString.should.be.equal('key%3A%2F%3B%3F=value%3A%2F%3B%3F');
		});
	});

	describe('#createURL', () => {
		// eslint-disable-next-line no-underscore-dangle
		const createURL = httpClient.__get__('createURL');

		it('should create without query', () => {
			const url = createURL('http://localhost:8080', 'transactions');
			return url.should.be.equal('http://localhost:8080/api/transactions');
		});

		it('should create with query', () => {
			const query = {
				key1: 'value1',
				key2: 'value2',
				key3: 'value3',
			};
			const url = createURL('http://localhost:8080', 'transactions', query);
			return url.should.be.equal(
				'http://localhost:8080/api/transactions?key1=value1&key2=value2&key3=value3',
			);
		});
	});

	describe('#get', () => {
		let popsicleStub;

		beforeEach(() => {
			popsicleStub = sandbox.stub(popsicle, 'request').returns({
				use: () => Promise.resolve(sendRequestResult),
			});
		});

		it('should be called with correct url and header', () => {
			httpClient
				.get(defaultFullURL, defaultHeader, defaultEndpoint)
				.then(() => {
					popsicleStub.should.be.calledWithExactly({
						method: GET,
						url: `${defaultFullURL}/api/${defaultEndpoint}`,
						headers: defaultHeader,
					});
				});
		});
		it('should be called with correct url, header and query', () => {
			const query = {
				key1: 'value1',
				key2: 'value2',
				key3: 'value3',
			};
			httpClient
				.get(defaultFullURL, defaultHeader, defaultEndpoint, query)
				.then(() => {
					popsicleStub.should.be.calledWithExactly({
						method: GET,
						url: `${defaultFullURL}/api/${defaultEndpoint}?key1=value1&key2=value2&key3=value3`,
						headers: defaultHeader,
					});
				});
		});
	});
	describe('#post', () => {
		let popsicleStub;

		beforeEach(() => {
			popsicleStub = sandbox.stub(popsicle, 'request').returns({
				use: () => Promise.resolve(sendRequestResult),
			});
		});

		it('should be called with correct url and header', () => {
			httpClient
				.post(defaultFullURL, defaultHeader, defaultEndpoint, defaultRequest)
				.then(() => {
					popsicleStub.should.be.calledWithExactly({
						method: POST,
						url: `${defaultFullURL}/api/${defaultEndpoint}`,
						headers: defaultHeader,
						body: defaultRequest,
					});
				});
		});
	});
});
