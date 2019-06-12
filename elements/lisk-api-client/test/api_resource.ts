/*
 * Copyright © 2018 Lisk Foundation
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
import { APIClient } from '../src/api_client';
import { APIResource } from '../src/api_resource';
import * as sinon from 'sinon';
import { AxiosRequestConfig } from 'axios';
// Required for stub
const axios = require('axios');

describe('API resource module', () => {
	const GET = 'GET';
	const defaultBasePath = 'http://localhost:1234';
	const defaultResourcePath = '/resources';
	const defaultFullPath = `${defaultBasePath}/api${defaultResourcePath}`;
	const defaultHeaders = {
		Accept: 'application/json',
		'Content-Type': 'application/json',
		nethash: 'mainnetHash',
		os: 'lisk-elements-api',
		version: '1.0.0',
		minVersion: '>=0.5.0',
		port: '443',
	};
	const defaultRequest = {
		method: GET,
		url: defaultFullPath,
		headers: defaultHeaders,
	};

	const sendRequestResult = {
		data: [],
		body: {},
		limit: 0,
	};

	interface FakeAPIClient {
		headers: object;
		currentNode: string;
		hasAvailableNodes: () => boolean | void;
		randomizeNodes: boolean;
		banActiveNodeAndSelect: () => void;
	}

	let resource: APIResource;
	let apiClient: FakeAPIClient;

	beforeEach(() => {
		apiClient = {
			headers: { ...defaultHeaders },
			currentNode: defaultBasePath,
			hasAvailableNodes: () => true,
			randomizeNodes: false,
			banActiveNodeAndSelect: sandbox.stub(),
		};
		resource = new APIResource(apiClient as APIClient);
		return Promise.resolve();
	});

	describe('#constructor', () => {
		it('should create an API resource instance', () => {
			return expect(resource).to.be.instanceOf(APIResource);
		});
	});

	describe('get headers', () => {
		it('should return header set to apiClient', () => {
			return expect(resource.headers).to.eql(defaultHeaders);
		});
	});

	describe('get resourcePath', () => {
		it('should return the resource’s full path', () => {
			return expect(resource.resourcePath).to.equal(`${defaultBasePath}/api`);
		});

		it('should return the resource’s full path with set path', () => {
			resource.path = defaultResourcePath;
			return expect(resource.resourcePath).to.equal(
				`${defaultBasePath}/api${defaultResourcePath}`,
			);
		});
	});

	describe('#request', () => {
		let requestStub: sinon.SinonStub;
		let handleRetryStub: () => Promise<void>;

		beforeEach(() => {
			requestStub = sandbox.stub(axios, 'request').resolves({
				status: 200,
				data: sendRequestResult,
			} as any);
			handleRetryStub = sandbox.stub(resource, 'handleRetry');
			return Promise.resolve();
		});

		it('should make a request to API without calling retry', () => {
			return resource
				.request(defaultRequest as AxiosRequestConfig, false)
				.then(res => {
					expect(requestStub).to.be.calledOnce;
					expect(requestStub).to.be.calledWithExactly(defaultRequest);
					expect(handleRetryStub).not.to.be.called;
					return expect(res).to.eql(sendRequestResult);
				});
		});

		it('should make a request to API without calling retry when it succeeds', () => {
			return resource
				.request(defaultRequest as AxiosRequestConfig, true)
				.then(res => {
					expect(requestStub).to.be.calledOnce;
					expect(requestStub).to.be.calledWithExactly(defaultRequest);
					expect(handleRetryStub).not.to.be.called;
					return expect(res).to.eql(sendRequestResult);
				});
		});

		describe('when response status is greater than 300', () => {
			it('should reject with errno if status code is supplied', () => {
				const statusCode = 300;
				requestStub.rejects({
					response: {
						status: statusCode,
						data: undefined,
					},
				});

				return resource
					.request(defaultRequest as AxiosRequestConfig, false)
					.catch(err => {
						return expect(err.errno).to.equal(statusCode);
					});
			});

			it('should reject with "An unknown error has occured." message if there is no data is supplied', () => {
				const statusCode = 300;
				requestStub.rejects({
					response: {
						status: statusCode,
						data: undefined,
					},
				});

				return resource
					.request(defaultRequest as AxiosRequestConfig, false)
					.catch(err => {
						return expect(err.message).to.equal(
							'An unknown error has occurred.',
						);
					});
			});

			it('should reject with "An unknown error has occured." message if there is no message is supplied', () => {
				const statusCode = 300;
				requestStub.rejects({
					response: {
						status: statusCode,
						data: sendRequestResult,
					},
				});

				return resource
					.request(defaultRequest as AxiosRequestConfig, false)
					.catch(err => {
						return expect(err.message).to.equal(
							'An unknown error has occurred.',
						);
					});
			});

			it('should reject with error message from server if message is supplied', () => {
				const serverErrorMessage = 'validation error';
				const statusCode = 300;
				requestStub.rejects({
					response: {
						status: statusCode,
						data: { message: serverErrorMessage },
					},
				});

				return resource
					.request(defaultRequest as AxiosRequestConfig, false)
					.catch(err => {
						return expect(err.message).to.eql(serverErrorMessage);
					});
			});

			it('should reject with error message from server if message is undefined and error is supplied', () => {
				const serverErrorMessage = 'error from server';
				const statusCode = 300;
				requestStub.rejects({
					response: {
						status: statusCode,
						data: { message: undefined, error: serverErrorMessage },
					},
				});

				return resource
					.request(defaultRequest as AxiosRequestConfig, false)
					.catch(err => {
						return expect(err.message).to.eql(serverErrorMessage);
					});
			});

			it('should reject with errors from server if errors are supplied', () => {
				const serverErrorMessage = 'validation error';
				const statusCode = 300;
				const errors = [
					{
						code: 'error_code_1',
						message: 'message1',
					},
					{
						code: 'error_code_2',
						message: 'message2',
					},
				];
				requestStub.rejects({
					response: {
						status: statusCode,
						data: { message: serverErrorMessage, errors },
					},
				});

				return resource
					.request(defaultRequest as AxiosRequestConfig, false)
					.catch(err => {
						return expect(err.errors).to.eql(errors);
					});
			});

			it('should reject with error if client rejects with plain error', () => {
				const clientError = new Error('client error');
				requestStub.rejects(clientError);
				return resource
					.request(defaultRequest as AxiosRequestConfig, false)
					.catch(err => {
						return expect(err).to.eql(clientError);
					});
			});

			it('should make a request to API with calling retry', () => {
				const statusCode = 300;
				requestStub.rejects({
					response: {
						status: statusCode,
						data: sendRequestResult,
					},
				});
				return resource
					.request(defaultRequest as AxiosRequestConfig, true)
					.catch(() => {
						expect(requestStub).to.be.calledOnce;
						return expect(handleRetryStub).to.be.calledOnce;
					});
			});
		});
	});

	describe('#handleRetry', () => {
		let requestStub: sinon.SinonStub;
		let defaultError: Error;
		beforeEach(() => {
			defaultError = new Error('could not connect to a node');
			requestStub = sandbox
				.stub(resource, 'request')
				.returns(Promise.resolve(sendRequestResult.body) as any);
			return Promise.resolve();
		});

		describe('when there is available node', () => {
			let clock: sinon.SinonFakeTimers;

			beforeEach(() => {
				clock = sinon.useFakeTimers();
				apiClient.hasAvailableNodes = () => true;
				return Promise.resolve();
			});

			afterEach(() => {
				return clock.restore();
			});

			it('should call banActiveNode when randomizeNodes is true', () => {
				apiClient.randomizeNodes = true;
				const req = resource.handleRetry(
					defaultError,
					defaultRequest as AxiosRequestConfig,
					1,
				);
				clock.tick(1000);
				return req.then(res => {
					expect(apiClient.banActiveNodeAndSelect).to.be.calledOnce;
					expect(requestStub).to.be.calledWith(defaultRequest, true);
					return expect(res).to.be.eql(sendRequestResult.body);
				});
			});

			it('should not call ban active node when randomizeNodes is false', () => {
				apiClient.randomizeNodes = false;
				const req = resource.handleRetry(
					defaultError,
					defaultRequest as AxiosRequestConfig,
					1,
				);
				clock.tick(1000);
				return req.then(res => {
					expect(apiClient.banActiveNodeAndSelect).not.to.be.called;
					expect(requestStub).to.be.calledWith(defaultRequest, true);
					return expect(res).to.be.eql(sendRequestResult.body);
				});
			});

			it('should throw an error when randomizeNodes is false and the maximum retry count has been reached', () => {
				apiClient.randomizeNodes = false;
				const req = resource.handleRetry(
					defaultError,
					defaultRequest as AxiosRequestConfig,
					4,
				);
				clock.tick(1000);
				return expect(req).to.be.rejectedWith(defaultError);
			});
		});

		describe('when there is no available node', () => {
			beforeEach(() => {
				apiClient.hasAvailableNodes = () => false;
				return Promise.resolve();
			});

			it('should throw an error that is the same as input error', () => {
				const res = resource.handleRetry(
					defaultError,
					defaultRequest as AxiosRequestConfig,
					1,
				);
				return expect(res).to.be.rejectedWith(defaultError);
			});
		});
	});
});
