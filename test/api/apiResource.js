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

import APIResource from 'api/apiResource';

const popsicle = require('popsicle');

describe('API resource module', () => {
	const GET = 'GET';
	const defaultBasePath = 'http://localhost:1234';
	const defaultResourcePath = '/resources';
	const defaultFullPath = `${defaultBasePath}/api${defaultResourcePath}`;
	const defaultHeaders = {
		'Content-Type': 'application/json',
		nethash: 'mainnetHash',
		os: 'lisk-js-api',
		version: '1.0.0',
		minVersion: '>=0.5.0',
		port: '443',
	};
	const defaultError = new Error('network error');
	const defaultRequest = {
		method: GET,
		url: defaultFullPath,
		headers: defaultHeaders,
	};

	const sendRequestResult = {
		body: { success: true, sendRequest: true },
	};
	let resource;
	let LiskAPI;
	let banActiveNodeAndSelectStub;
	let handleRetrySpy;

	beforeEach(() => {
		LiskAPI = {
			headers: Object.assign({}, defaultHeaders),
			nodeFullURL: defaultBasePath,
			hasAvailableNodes: () => {},
			randomizeNodes: () => {},
			banActiveNodeAndSelect: () => {},
		};

		banActiveNodeAndSelectStub = sandbox.stub(
			LiskAPI,
			'banActiveNodeAndSelect',
		);
		resource = new APIResource(LiskAPI);
		handleRetrySpy = sandbox.spy(resource, 'handleRetry');
	});

	describe('#constructor', () => {
		it('should create an API resource instance', () => {
			return resource.should.be.instanceOf(APIResource);
		});

		it('should throw an error without an input', () => {
			return (() => new APIResource()).should.throw(
				'Require LiskAPI instance to be initialized.',
			);
		});
	});

	describe('get headers', () => {
		it('should return header set to liskAPI', () => {
			return resource.headers.should.eql(defaultHeaders);
		});
	});

	describe('get resourcePath', () => {
		it("should return the resource's full path", () => {
			return resource.resourcePath.should.equal(`${defaultBasePath}/api`);
		});
		it("should return the resource's full path with set path", () => {
			resource.path = defaultResourcePath;
			return resource.resourcePath.should.equal(
				`${defaultBasePath}/api${defaultResourcePath}`,
			);
		});
	});

	describe('#request', () => {
		let popsicleStub;

		beforeEach(() => {
			popsicleStub = sandbox.stub(popsicle, 'request').returns({
				use: () => Promise.resolve(sendRequestResult),
			});
		});

		it('should make a request to API without calling retry', () => {
			return resource.request(defaultRequest, false).then(res => {
				popsicleStub.should.be.calledOnce();
				handleRetrySpy.should.not.be.called();
				return res.should.eql(sendRequestResult.body);
			});
		});

		it('should make a request to API without calling retry when it successes', () => {
			return resource.request(defaultRequest, true).then(res => {
				popsicleStub.should.be.calledOnce();
				handleRetrySpy.should.not.be.called();
				return res.should.eql(sendRequestResult.body);
			});
		});

		it('should make a request to API with calling retry when it fails', () => {
			popsicleStub.returns({
				use: () => Promise.reject(defaultError),
			});
			return resource.request(defaultRequest, true).catch(err => {
				popsicleStub.should.be.calledOnce();
				handleRetrySpy.should.be.calledOnce();
				return err.should.eql(defaultError);
			});
		});
	});

	describe('#handleRetry', () => {
		let requestStub;
		beforeEach(() => {
			requestStub = sandbox
				.stub(resource, 'request')
				.returns(Promise.resolve(sendRequestResult.body));
		});

		describe('when there is available node', () => {
			let clock;

			beforeEach(() => {
				clock = sinon.useFakeTimers();
				LiskAPI.hasAvailableNodes = () => true;
			});

			afterEach(() => {
				clock.restore();
			});

			it('should call banActiveNode when randomizeNodes is true', () => {
				LiskAPI.randomizeNodes = true;
				const req = resource.handleRetry(defaultError, defaultRequest);
				clock.tick(1000);
				req.then(res => {
					banActiveNodeAndSelectStub.should.be.calledOnce();
					requestStub.should.be.calledWith(defaultRequest, true);
					return res.should.be.eql(sendRequestResult.body);
				});
			});

			it('should not call ban active node when randomizeNodes is false', () => {
				LiskAPI.randomizeNodes = false;
				const req = resource.handleRetry(defaultError, defaultRequest);
				clock.tick(1000);
				req.then(res => {
					banActiveNodeAndSelectStub.should.not.be.called();
					requestStub.should.be.calledWith(defaultRequest, true);
					return res.should.be.eql(sendRequestResult.body);
				});
			});
		});
		describe('when there is no available node', () => {
			beforeEach(() => {
				LiskAPI.hasAvailableNodes = () => false;
			});

			it('should resolve with failure response', () => {
				const req = resource.handleRetry(defaultError, defaultRequest);
				req.then(res => {
					res.success.should.be.false();
					res.error.should.eql(defaultError);
					return res.message.should.equal(
						'Could not create an HTTP request to any known nodes.',
					);
				});
			});
		});
	});
});
