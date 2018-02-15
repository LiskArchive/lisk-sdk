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

describe('api method module', () => {
	const GET = 'GET';
	const POST = 'POST';
	const defaultBasePath = 'http://localhost:1234/api';
	const defaultResourcePath = '/resources';
	const defaultFullPath = `${defaultBasePath}${defaultResourcePath}`;
	const errorArgumentNumber = Error('Arguments must include Params defined.');
	const defaultHeaders = {
		'Content-Type': 'application/json',
		nethash: 'mainnetHash',
		os: 'lisk-js-api',
		version: '1.0.0',
		minVersion: '>=0.5.0',
		port: '443',
	};
	let Resource;
	let requestResult;
	let requestStub;

	beforeEach(() => {
		Resource = {
			path: defaultResourcePath,
			resourcePath: defaultFullPath,
			headers: defaultHeaders,
			request: () => {},
			handleRetry: () => {},
		};
		requestResult = { success: true, sendRequest: true };
		requestStub = sandbox
			.stub(Resource, 'request')
			.resolves(Object.assign({}, requestResult));
	});

	describe('#apiMethod', () => {
		describe('when no parameters are passed', () => {
			let handler;
			beforeEach(() => {
				handler = apiMethod().bind(Resource);
			});

			it('should return function', () => {
				return handler.should.be.type('function');
			});

			it('should request GET with default URL', () => {
				return handler().then(() => {
					requestStub.should.be.calledOnce();
					return requestStub.should.be.calledWithExactly(
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
			let handler;
			beforeEach(() => {
				handler = apiMethod({
					method: POST,
					path: '/{related}/ids/{id}',
					urlParams: ['related', 'id'],
					validator: data => {
						if (!data.needed) {
							throw Error('no data');
						}
					},
					defaultData: {
						sort: 'id',
					},
					retry: true,
				}).bind(Resource);
			});

			it('should return function', () => {
				return handler.should.be.type('function');
			});

			it('should be rejected with error without param', () => {
				return handler().should.be.rejectedWith(errorArgumentNumber);
			});

			it('should be rejected with error without enough param', () => {
				return handler().should.be.rejectedWith(errorArgumentNumber);
			});

			it('should be rejected with no data', () => {
				return handler('r-123', 'id-123').should.be.rejectedWith(
					Error('no data'),
				);
			});

			it('should be request with the given data', () => {
				return handler('r-123', 'id-123', { needed: true }).then(() => {
					requestStub.should.be.calledOnce();
					return requestStub.should.be.calledWithExactly(
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
			let handler;
			beforeEach(() => {
				handler = apiMethod({
					method: GET,
					path: '/{related}/ids/{id}',
					urlParams: ['related', 'id'],
					validator: data => {
						if (!data.needed) {
							throw Error('no data');
						}
					},
					defaultData: {
						sort: 'id',
					},
				}).bind(Resource);
			});

			it('should return function', () => {
				return handler.should.be.type('function');
			});

			it('should be rejected with error without param', () => {
				return handler().should.be.rejectedWith(errorArgumentNumber);
			});

			it('should be rejected with error without enough param', () => {
				return handler().should.be.rejectedWith(errorArgumentNumber);
			});

			it('should be rejected with no data', () => {
				return handler('r-123', 'id-123').should.be.rejectedWith(
					Error('no data'),
				);
			});

			it('should be request with the given data', () => {
				return handler('r-123', 'id-123', { needed: true }).then(() => {
					requestStub.should.be.calledOnce();
					return requestStub.should.be.calledWithExactly(
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
