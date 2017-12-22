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
const privateApi = require('api/privateApi');

describe('privateApi module', () => {
	const port = 7000;
	const localNode = 'localhost';
	const externalNode = 'external';
	const sslNode = 'sslNode';
	const externalTestnetNode = 'testnet';
	const GET = 'GET';
	const POST = 'POST';
	const defaultMethod = POST;
	const defaultEndpoint = 'transactions';
	const defaultData = 'testData';
	const defaultNodes = [localNode, externalNode];
	const defaultSSLNodes = [localNode, externalNode, sslNode];
	const defaultTestnetNodes = [localNode, externalTestnetNode];

	let LSK;
	let sendRequestResult;
	let sendRequestStub;

	beforeEach(() => {
		LSK = {
			randomNode: false,
			node: localNode,
			defaultNodes: [].concat(defaultNodes),
			defaultSSLNodes: [].concat(defaultSSLNodes),
			defaultTestnetNodes: [].concat(defaultTestnetNodes),
			bannedNodes: [],
			port,
			options: {
				node: localNode,
			},
			nethash: {
				foo: 'bar',
			},

			banActiveNode: sandbox.spy(),
			hasAvailableNodes: sandbox.stub(),
			sendRequest: () => {},
			setNode: () => {},
			setTestnet: () => {},
		};
		sendRequestResult = { success: true, sendRequest: true };
		sendRequestStub = sandbox
			.stub(LSK, 'sendRequest')
			.resolves(Object.assign({}, sendRequestResult));
	});

	describe('#createRequestObject', () => {
		let options;
		let expectedObject;

		beforeEach(() => {
			options = {
				limit: 5,
				offset: 3,
				details: defaultData,
			};
			expectedObject = {
				method: GET,
				url: `http://${localNode}:${port}/api/${defaultEndpoint}`,
				headers: LSK.nethash,
				body: {},
			};
		});

		it('should create a valid request object for GET request', () => {
			expectedObject.url += `?limit=${options.limit}&offset=${options.offset}&details=${options.details}`;

			const requestObject = privateApi.createRequestObject.call(
				LSK,
				GET,
				defaultEndpoint,
				options,
			);
			return requestObject.should.be.eql(expectedObject);
		});

		it('should create a valid request object for POST request', () => {
			expectedObject.body = Object.assign({}, options);
			expectedObject.method = POST;

			const requestObject = privateApi.createRequestObject.call(
				LSK,
				POST,
				defaultEndpoint,
				options,
			);
			return requestObject.should.be.eql(expectedObject);
		});

		it('should create a valid request object for POST request without options', () => {
			expectedObject.method = POST;

			const requestObject = privateApi.createRequestObject.call(
				LSK,
				POST,
				defaultEndpoint,
			);
			return requestObject.should.be.eql(expectedObject);
		});

		it('should create a valid request object for undefined request method without options', () => {
			expectedObject.method = undefined;

			const requestObject = privateApi.createRequestObject.call(
				LSK,
				undefined,
				defaultEndpoint,
			);
			return requestObject.should.be.eql(expectedObject);
		});
	});

	describe('#sendRequestPromise', () => {
		const { sendRequestPromise } = privateApi;

		let options;
		let createRequestObjectResult;
		let createRequestObjectStub;
		let restoreCreateRequestObject;
		let sendRequestPromiseResult;

		beforeEach(() => {
			sandbox.stub(popsicle, 'request').returns({
				use: () => Promise.reject(new popsicle.PopsicleError('oh no')),
			});
			options = {
				key1: 'value 2',
				key3: 4,
			};
			createRequestObjectResult = {
				method: defaultMethod,
				url: `http://${localNode}:${port}/api/bad_endpoint?k=v`,
				headers: {},
				body: {},
			};
			createRequestObjectStub = sandbox
				.stub()
				.returns(Object.assign({}, createRequestObjectResult));
			// eslint-disable-next-line no-underscore-dangle
			restoreCreateRequestObject = privateApi.__set__(
				'createRequestObject',
				createRequestObjectStub,
			);
			sendRequestPromiseResult = sendRequestPromise
				.call(LSK, defaultMethod, defaultEndpoint, options)
				.catch(result => result);
			return sendRequestPromiseResult;
		});

		afterEach(() => {
			restoreCreateRequestObject();
		});

		it('should create a request object', () => {
			createRequestObjectStub.calledOn(LSK).should.be.true();
			return createRequestObjectStub.should.be.calledWithExactly(
				defaultMethod,
				defaultEndpoint,
				options,
			);
		});

		it('should return the result of a popsicle request', () => {
			return sendRequestPromiseResult.then(result => {
				result.should.be.instanceof(popsicle.PopsicleError);
			});
		});
	});

	describe('#handleTimestampIsInFutureFailures', () => {
		const { handleTimestampIsInFutureFailures } = privateApi;
		let result;
		let options;

		beforeEach(() => {
			result = {
				success: false,
				message: 'Timestamp is in the future',
			};
			options = {
				key1: 'value 1',
				key2: 2,
				timeOffset: 40,
			};
		});

		it('should resolve the result if success is true', () => {
			result.success = true;
			return handleTimestampIsInFutureFailures
				.call(LSK, defaultMethod, defaultEndpoint, options, result)
				.then(returnValue => {
					returnValue.should.equal(result);
				});
		});

		it('should resolve the result if there is no message', () => {
			delete result.message;
			return handleTimestampIsInFutureFailures
				.call(LSK, defaultMethod, defaultEndpoint, options, result)
				.then(returnValue => {
					returnValue.should.equal(result);
				});
		});

		it('should resolve the result if the message is not about the timestamp being in the future', () => {
			result.message = 'Timestamp is in the past';
			return handleTimestampIsInFutureFailures
				.call(LSK, defaultMethod, defaultEndpoint, options, result)
				.then(returnValue => {
					returnValue.should.equal(result);
				});
		});

		it('should resolve the result if the time offset is greater than 40 seconds', () => {
			options.timeOffset = 41;
			return handleTimestampIsInFutureFailures
				.call(LSK, defaultMethod, defaultEndpoint, options, result)
				.then(returnValue => {
					returnValue.should.equal(result);
				});
		});

		it('should resend the request with a time offset of 10 seconds if all those conditions are met and the time offset is not specified', () => {
			delete options.timeOffset;
			const expectedOptions = Object.assign({}, options, {
				timeOffset: 10,
			});
			return handleTimestampIsInFutureFailures
				.call(LSK, defaultMethod, defaultEndpoint, options, result)
				.then(returnValue => {
					returnValue.should.be.eql(sendRequestResult);
					sendRequestStub.should.be.calledWithExactly(
						defaultMethod,
						defaultEndpoint,
						expectedOptions,
					);
				});
		});

		it('should resend the request with the time offset increased by 10 seconds if all those conditions are met and the time offset is specified', () => {
			const expectedOptions = Object.assign({}, options, {
				timeOffset: 50,
			});
			return handleTimestampIsInFutureFailures
				.call(LSK, defaultMethod, defaultEndpoint, options, result)
				.then(returnValue => {
					returnValue.should.be.eql(sendRequestResult);
					sendRequestStub.should.be.calledWithExactly(
						defaultMethod,
						defaultEndpoint,
						expectedOptions,
					);
				});
		});
	});

	describe('#handleSendRequestFailures', () => {
		const { handleSendRequestFailures } = privateApi;

		let options;
		let error;
		let setNodeSpy;
		let clock;

		beforeEach(() => {
			options = {
				key1: 'value 1',
				key2: 2,
			};
			error = new Error('Test error.');
			setNodeSpy = sandbox.spy(LSK, 'setNode');
		});

		afterEach(() => {
			LSK.banActiveNode();
		});

		describe('if a redial is possible', () => {
			beforeEach(() => {
				LSK.hasAvailableNodes.returns(true);
				clock = sinon.useFakeTimers();
			});

			afterEach(() => {
				clock.restore();
			});

			it('should ban the node with options randomNode true', () => {
				LSK.randomNode = true;
				const request = handleSendRequestFailures.call(
					LSK,
					defaultMethod,
					defaultEndpoint,
					options,
					error,
				);
				clock.tick(1000);
				return request.then(() => LSK.banActiveNode.should.be.called());
			});

			it('should not ban the node with options randomNode false', () => {
				LSK.randomNode = false;
				const request = handleSendRequestFailures.call(
					LSK,
					defaultMethod,
					defaultEndpoint,
					options,
					error,
				);
				clock.tick(1000);
				return request.then(() => LSK.banActiveNode.should.not.be.called());
			});

			it('should set a new node', () => {
				const request = handleSendRequestFailures.call(
					LSK,
					defaultMethod,
					defaultEndpoint,
					options,
					error,
				);
				clock.tick(1000);
				return request.then(() => setNodeSpy.should.be.calledOnce());
			});

			it('should send the request again with the same arguments', () => {
				const request = handleSendRequestFailures.call(
					LSK,
					defaultMethod,
					defaultEndpoint,
					options,
					error,
				);
				clock.tick(1000);
				return request.then(() => {
					sendRequestStub.should.be.calledWithExactly(
						defaultMethod,
						defaultEndpoint,
						options,
					);
				});
			});

			it('should resolve to the result of the request', () => {
				const request = handleSendRequestFailures.call(
					LSK,
					defaultMethod,
					defaultEndpoint,
					options,
					error,
				);
				clock.tick(1000);
				return request.then(result => result.should.be.eql(sendRequestResult));
			});
		});

		describe('if no redial is possible', () => {
			beforeEach(() => {
				LSK.hasAvailableNodes.returns(false);
			});

			it('should resolve to an object with success set to false', () => {
				return handleSendRequestFailures
					.call(LSK, defaultMethod, defaultEndpoint, options, error)
					.then(result => {
						result.should.have.property('success').and.be.equal(false);
					});
			});

			it('should resolve to an object with the provided error if no redial is possible', () => {
				return handleSendRequestFailures
					.call(LSK, defaultMethod, defaultEndpoint, options, error)
					.then(result => {
						result.should.have.property('error').and.be.equal(error);
					});
			});

			it('should resolve to an object with a helpful message', () => {
				return handleSendRequestFailures
					.call(LSK, defaultMethod, defaultEndpoint, options, error)
					.then(result => {
						result.should.have
							.property('message')
							.and.be.equal(
								'Could not create an HTTP request to any known nodes.',
							);
					});
			});
		});
	});
});
