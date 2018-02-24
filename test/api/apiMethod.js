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

import apiMethod from 'api/apiMethod';

describe('API method module', () => {
	const GET = 'GET';
	const POST = 'POST';
	const defaultBasePath = 'http://localhost:1234/api';
	const defaultresourcePath = '/resources';
	const defaultFullPath = `${defaultBasePath}${defaultresourcePath}`;
	const defaultHeaders = {
		'Content-Type': 'application/json',
		nethash: 'mainnetHash',
		os: 'lisk-js-api',
		version: '1.0.0',
		minVersion: '>=0.5.0',
		port: '443',
	};
	let resource;
	let requestResult;
	let handler;
	let errorArgumentNumber;
	let validationError;

	beforeEach(() => {
		requestResult = { success: true, sendRequest: true };
		resource = {
			path: defaultresourcePath,
			resourcePath: defaultFullPath,
			headers: defaultHeaders,
			request: sandbox.stub().resolves(requestResult),
			handleRetry: () => {},
		};
		validationError = new Error('No data');
	});

	describe('#apiMethod', () => {
		describe('when no parameters are passed', () => {
			beforeEach(() => {
				handler = apiMethod().bind(resource);
			});

			it('should return function', () => {
				return handler.should.be.type('function');
			});

			it('should request GET with default URL', () => {
				return handler().then(() => {
					resource.request.should.be.calledOnce();
					return resource.request.should.be.calledWithExactly(
						{
							method: GET,
							url: defaultFullPath,
							headers: defaultHeaders,
						},
						false,
					);
				});
			});
		});

		describe('when initialized with POST / parameters', () => {
			beforeEach(() => {
				handler = apiMethod({
					method: POST,
					path: '/{related}/ids/{id}',
					urlParams: ['related', 'id'],
					validator: data => {
						if (!data.needed) {
							throw validationError;
						}
					},
					defaultData: {
						sort: 'id',
					},
					retry: true,
				}).bind(resource);
				errorArgumentNumber = new Error(
					'This endpoint must be supplied with the following parameters: related,id',
				);
			});

			it('should return function', () => {
				return handler.should.be.type('function');
			});

			it('should be rejected with error without param', () => {
				return handler().should.be.rejectedWith(errorArgumentNumber);
			});

			it('should be rejected with error without enough param', () => {
				return handler('r-123').should.be.rejectedWith(errorArgumentNumber);
			});

			it('should be rejected with no data', () => {
				return handler('r-123', 'id-123').should.be.rejectedWith(
					validationError,
				);
			});

			it('should call request with the given data', () => {
				return handler('r-123', 'id-123', { needed: true }).then(() => {
					resource.request.should.be.calledOnce();
					return resource.request.should.be.calledWithExactly(
						{
							method: POST,
							url: `${defaultFullPath}/r-123/ids/id-123`,
							headers: defaultHeaders,
							body: {
								needed: true,
								sort: 'id',
							},
						},
						true,
					);
				});
			});
		});

		describe('when initialized with GET / parameters', () => {
			beforeEach(() => {
				handler = apiMethod({
					method: GET,
					path: '/{related}/ids/{id}',
					urlParams: ['related', 'id'],
					validator: data => {
						if (!data.needed) {
							throw validationError;
						}
					},
					defaultData: {
						sort: 'id',
					},
				}).bind(resource);
				errorArgumentNumber = new Error(
					'This endpoint must be supplied with the following parameters: related,id',
				);
			});

			it('should return a function', () => {
				return handler.should.be.type('function');
			});

			it('should be rejected with error without parameters', () => {
				return handler().should.be.rejectedWith(errorArgumentNumber);
			});

			it('should be rejected with error without enough parameters', () => {
				return handler('r-123').should.be.rejectedWith(errorArgumentNumber);
			});

			it('should be rejected with no data', () => {
				return handler('r-123', 'id-123').should.be.rejectedWith(
					validationError,
				);
			});

			it('should be request with the given data', () => {
				return handler('r-123', 'id-123', { needed: true }).then(() => {
					resource.request.should.be.calledOnce();
					return resource.request.should.be.calledWithExactly(
						{
							method: GET,
							url: `${defaultFullPath}/r-123/ids/id-123?sort=id&needed=true`,
							headers: defaultHeaders,
						},
						false,
					);
				});
			});
		});
	});
});
