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
import privateApi from '../../src/api/privateApi';

describe('privateApi module @now', () => {
	const port = 7000;
	const localNode = 'localhost';
	const externalNode = 'external';
	const externalTestnetNode = 'testnet';
	const defaultData = 'testData';
	const GET = 'GET';
	const POST = 'POST';
	const defaultMethod = POST;
	const defaultEndpoint = 'transactions';

	let LSK;
	let sendRequestResult;
	let sendRequestStub;

	beforeEach(() => {
		LSK = {
			randomPeer: false,
			currentPeer: localNode,
			defaultPeers: [localNode, externalNode],
			defaultSSLPeers: [localNode, externalNode],
			defaultTestnetPeers: [localNode, externalTestnetNode],
			bannedPeers: [],
			port,
			options: {
				node: localNode,
			},
			nethash: {
				foo: 'bar',
			},

			parseOfflineRequests: () => ({
				requestMethod: 'GET',
			}),
			setTestnet: () => {},
			setNode: () => {},
			sendRequest: () => {},
		};
		sendRequestResult = { success: true };
		sendRequestStub = sinon.stub(LSK, 'sendRequest').resolves(Object.assign(sendRequestResult));
	});

	afterEach(() => {
		sendRequestStub.restore();
	});

	describe('#netHashOptions', () => {
		it('should have tests');
	});

	describe('#getURLPrefix', () => {
		it('should be http when ssl is false', () => {
			LSK.ssl = false;

			(privateApi.getURLPrefix.call(LSK)).should.be.equal('http');
		});

		it('should be https when ssl is true', () => {
			LSK.ssl = true;

			(privateApi.getURLPrefix.call(LSK)).should.be.equal('https');
		});
	});

	describe('#getFullUrl', () => {
		it('should give the full url inclusive port', () => {
			const fullUrl = `http://${localNode}:${port}`;

			(privateApi.getFullUrl.call(LSK)).should.be.equal(fullUrl);
		});

		it('should give the full url without port and with SSL', () => {
			LSK.port = '';
			LSK.ssl = true;
			const fullUrl = `https://${localNode}`;

			(privateApi.getFullUrl.call(LSK)).should.be.equal(fullUrl);
		});
	});

	describe('#getRandomPeer', () => {
		it('should give a random peer', () => {
			(privateApi.getRandomPeer.call(LSK)).should.be.ok();
		});
	});

	describe('#selectNode', () => {
		it('should return the node from initial settings when set', () => {
			(privateApi.selectNode.call(LSK)).should.be.equal(localNode);
		});
	});

	describe('#banNode', () => {
		it('should add current node to banned peers', () => {
			const currentNode = LSK.currentPeer;
			privateApi.banNode.call(LSK);

			(LSK.bannedPeers).should.containEql(currentNode);
		});
	});

	describe('#checkReDial', () => {
		beforeEach(() => {
			LSK.randomPeer = true;
		});

		it('should check if all the peers are already banned', () => {
			(privateApi.checkReDial.call(LSK)).should.be.equal(true);
		});

		it.skip('should be able to get a new node when current one is not reachable', () => {
			return LSK.sendRequest('blocks/getHeight', {}, (result) => {
				(result).should.be.type('object');
			});
		});

		it('should recognize that now all the peers are banned for mainnet', () => {
			LSK.bannedPeers = LSK.defaultPeers;

			(privateApi.checkReDial.call(LSK)).should.be.equal(false);
		});

		it('should recognize that now all the peers are banned for testnet', () => {
			LSK.testnet = true;
			LSK.bannedPeers = LSK.defaultTestnetPeers;

			(privateApi.checkReDial.call(LSK)).should.be.equal(false);
		});

		it('should recognize that now all the peers are banned for ssl', () => {
			LSK.ssl = true;
			LSK.bannedPeers = LSK.defaultSSLPeers;

			(privateApi.checkReDial.call(LSK)).should.be.equal(false);
		});

		it.skip('should stop redial when all the peers are banned already', () => {
			LSK.bannedPeers = LSK.defaultPeers;
			LSK.currentPeer = '';

			return LSK.sendRequest('blocks/getHeight').then((e) => {
				(e.message).should.be.equal('could not create http request to any of the given peers');
			});
		});

		it('should redial to new node when randomPeer is set true', () => {
			LSK.randomPeer = true;

			(privateApi.checkReDial.call(LSK)).should.be.equal(true);
		});

		it('should not redial to new node when randomPeer is set to true but unknown nethash provided', () => {
			LSK.options.nethash = '123';

			(privateApi.checkReDial.call(LSK)).should.be.equal(false);
		});

		it('should redial to mainnet nodes when nethash is set and randomPeer is true', () => {
			LSK.options.nethash = 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511';
			const stub = sinon.stub(LSK, 'setTestnet');

			(privateApi.checkReDial.call(LSK)).should.be.true();
			(stub.calledWithExactly(false)).should.be.true();
			stub.restore();
		});

		it('should redial to testnet nodes when nethash is set and randomPeer is true', () => {
			LSK.options.nethash = 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba';
			const stub = sinon.stub(LSK, 'setTestnet');

			(privateApi.checkReDial.call(LSK)).should.be.equal(true);
			(stub.calledWithExactly(true)).should.be.true();
			stub.restore();
		});

		it('should not redial when randomPeer is set false', () => {
			LSK.randomPeer = false;

			(privateApi.checkReDial.call(LSK)).should.be.equal(false);
		});
	});

	describe.skip('#checkOptions', () => {
		it('should not accept falsy options like undefined', () => {
			(function sendRequestWithUndefinedLimit() {
				LSK.sendRequest('delegates/', { limit: undefined }, () => {});
			}).should.throw('parameter value "limit" should not be undefined');
		});

		it('should not accept falsy options like NaN', () => {
			(function sendRequestWithNaNLimit() {
				LSK.sendRequest('delegates/', { limit: NaN }, () => {});
			}).should.throw('parameter value "limit" should not be NaN');
		});
	});

	describe('#serialiseHttpData', () => {
		it('should create a http string from an object and trim.', () => {
			const myObj = {
				obj: ' myval',
				key: 'my2ndval ',
			};

			const serialised = privateApi.serialiseHttpData(myObj);

			(serialised).should.be.equal('?obj=myval&key=my2ndval');
		});
	});

	describe('#createRequestObject', () => {
		const requestType = 'transaction';
		let options;
		let expectedObject;

		beforeEach(() => {
			options = { limit: 5, offset: 3, details: defaultData };
			expectedObject = {
				method: GET,
				url: `http://${localNode}:${port}/api/${requestType}`,
				headers: LSK.nethash,
				body: {},
			};
		});

		it('should create a valid request Object for GET request', () => {
			const requestObject = privateApi.createRequestObject.call(LSK, GET, requestType, options);
			expectedObject.url += `?limit=${options.limit}&offset=${options.offset}&details=${options.details}`;

			(requestObject).should.be.eql(expectedObject);
		});

		it('should create a valid request Object for POST request', () => {
			const requestObject = privateApi.createRequestObject.call(LSK, POST, requestType, options);
			expectedObject.body = { limit: 5, offset: 3, details: 'testData' };
			expectedObject.method = POST;

			(requestObject).should.be.eql(expectedObject);
		});

		it('should create a valid request Object for POST request without options', () => {
			const requestObject = privateApi.createRequestObject.call(LSK, POST, requestType);
			expectedObject.method = POST;

			(requestObject).should.be.eql(expectedObject);
		});

		it('should create a valid request Object for undefined request without options', () => {
			const requestObject = privateApi.createRequestObject.call(LSK, undefined, requestType);
			expectedObject.method = undefined;

			(requestObject).should.be.eql(expectedObject);
		});
	});


	describe('#constructRequestData', () => {
		const address = '18160565574430594874L';
		const defaultRequestLimit = 10;
		const defaultRequestOffset = 101;
		const optionsObject = {
			limit: defaultRequestLimit,
			offset: defaultRequestOffset,
		};
		const expectedObject = {
			address,
			limit: defaultRequestLimit,
			offset: defaultRequestOffset,
		};
		const optionsWithConflictObject = {
			address: '123L',
			limit: 4,
			offset: 5,
		};
		const resolvedConflictObject = {
			address: '123L',
			limit: defaultRequestLimit,
			offset: defaultRequestOffset,
		};

		it('should merge a data object with an options object', () => {
			const requestData = privateApi.constructRequestData({ address }, optionsObject);
			(requestData).should.be.eql(expectedObject);
		});

		it('should recognise when a callback function is passed instead of an options object', () => {
			const requestData = privateApi.constructRequestData({ address }, () => true);
			(requestData).should.be.eql({ address });
		});

		it('should prioritise values from the data object when the data object and options object conflict', () => {
			const requestData = privateApi.constructRequestData(
				{ limit: defaultRequestLimit, offset: defaultRequestOffset }, optionsWithConflictObject,
			);
			(requestData).should.be.eql(resolvedConflictObject);
		});
	});

	describe('#sendRequestPromise', () => {
		it('should have tests');
	});

	describe('#wrapSendRequest', () => {
		const { wrapSendRequest } = privateApi;
		const value = '123';

		let options;
		let getDataFnResult;
		let getDataFnStub;
		let constructRequestDataResult;
		let constructRequestDataStub;
		let restoreConstructRequestDataStub;
		let callback;
		let returnedFunction;

		beforeEach(() => {
			options = {
				key1: 'value 1',
				key2: 2,
			};
			getDataFnResult = {
				key3: 'value3',
				key4: 4,
			};
			constructRequestDataResult = {
				key5: 'value 5',
				key6: 6,
			};
			getDataFnStub = sinon.stub().returns(Object.assign({}, getDataFnResult));
			constructRequestDataStub = sinon.stub()
				.returns(Object.assign({}, constructRequestDataResult));
			// eslint-disable-next-line no-underscore-dangle
			restoreConstructRequestDataStub = privateApi.__set__('constructRequestData', constructRequestDataStub);
			returnedFunction = wrapSendRequest(defaultMethod, defaultEndpoint, getDataFnStub);
			callback = () => {};
		});

		afterEach(() => {
			restoreConstructRequestDataStub();
		});

		it('should return a function', () => {
			(returnedFunction).should.be.type('function');
		});

		describe('returned function', () => {
			it('should call the provided getData function on the provided value and options', () => {
				return returnedFunction.call(LSK, value, options)
					.then(() => {
						(getDataFnStub.calledWithExactly(value, options)).should.be.true();
					});
			});

			it('should construct request data using the provided data and options', () => {
				return returnedFunction.call(LSK, value, options)
					.then(() => {
						(constructRequestDataStub.calledWithExactly(getDataFnResult, options)).should.be.true();
					});
			});

			it('should send a request with the constructed data and a callback if options are provided', () => {
				return returnedFunction.call(LSK, value, options, callback)
					.then(() => {
						(sendRequestStub.calledWithExactly(
							defaultMethod, defaultEndpoint, constructRequestDataResult, callback,
						)).should.be.true();
					});
			});

			it('should send a request with the constructed data and a callback if options are not provided', () => {
				return returnedFunction.call(LSK, value, callback)
					.then(() => {
						(sendRequestStub.calledWithExactly(
							defaultMethod, defaultEndpoint, constructRequestDataResult, callback,
						)).should.be.true();
					});
			});

			it('should return the result of the sent request', () => {
				return returnedFunction.call(LSK, value, callback)
					.then((result) => {
						(result).should.be.equal(sendRequestResult);
					});
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
				.then((returnValue) => {
					(returnValue).should.equal(result);
				});
		});

		it('should resolve the result if there is no message', () => {
			delete result.message;
			return handleTimestampIsInFutureFailures
				.call(LSK, defaultMethod, defaultEndpoint, options, result)
				.then((returnValue) => {
					(returnValue).should.equal(result);
				});
		});

		it('should resolve the result if the message is not about the timestamp being in the future', () => {
			result.message = 'Timestamp is in the past';
			return handleTimestampIsInFutureFailures
				.call(LSK, defaultMethod, defaultEndpoint, options, result)
				.then((returnValue) => {
					(returnValue).should.equal(result);
				});
		});

		it('should resolve the result if the time offset is greater than 40 seconds', () => {
			options.timeOffset = 41;
			return handleTimestampIsInFutureFailures
				.call(LSK, defaultMethod, defaultEndpoint, options, result)
				.then((returnValue) => {
					(returnValue).should.equal(result);
				});
		});

		it('should resend the request with a time offset of 10 seconds if all those conditions are met and the time offset is not specified', () => {
			delete options.timeOffset;
			const expectedOptions = Object.assign({}, options, { timeOffset: 10 });
			return handleTimestampIsInFutureFailures
				.call(LSK, defaultMethod, defaultEndpoint, options, result)
				.then((returnValue) => {
					(returnValue).should.be.eql(sendRequestResult);
					(sendRequestStub.calledWithExactly(defaultMethod, defaultEndpoint, expectedOptions))
						.should.be.true();
				});
		});

		it('should resend the request with the time offset increased by 10 seconds if all those conditions are met and the time offset is specified', () => {
			const expectedOptions = Object.assign({}, options, { timeOffset: 50 });
			return handleTimestampIsInFutureFailures
				.call(LSK, defaultMethod, defaultEndpoint, options, result)
				.then((returnValue) => {
					(returnValue).should.be.eql(sendRequestResult);
					(sendRequestStub.calledWithExactly(defaultMethod, defaultEndpoint, expectedOptions))
						.should.be.true();
				});
		});
	});

	describe.skip('#handleSendRequestFailures', () => {
		const { handleSendRequestFailures } = privateApi;

		let options;
		let error;
		let setNodeSpy;
		let banNodeSpy;
		let restoreBanNodeSpy;
		let checkReDialStub;
		let restoreCheckReDialStub;

		beforeEach(() => {
			options = {
				key1: 'value 1',
				key2: 2,
			};
			error = new Error('Test error.');
			setNodeSpy = sinon.spy(LSK, 'setNode');
			banNodeSpy = sinon.spy();
			// eslint-disable-next-line no-underscore-dangle
			restoreBanNodeSpy = privateApi.__set__('banNode', banNodeSpy);
		});

		afterEach(() => {
			setNodeSpy.restore();
			restoreBanNodeSpy();
		});

		describe('if a redial is possible', () => {
			beforeEach(() => {
				checkReDialStub = sinon.stub().returns(true);
				// eslint-disable-next-line no-underscore-dangle
				restoreCheckReDialStub = privateApi.__set__('checkReDial', checkReDialStub);
			});

			afterEach(() => {
				restoreCheckReDialStub();
			});

			it('should ban the node', () => {
				return handleSendRequestFailures.call(LSK, defaultMethod, defaultEndpoint, options, error)
					.then(() => {
						(banNodeSpy.calledOn(LSK)).should.be.true();
					});
			});

			it('should set a new node', () => {
				return handleSendRequestFailures.call(LSK, defaultMethod, defaultEndpoint, options, error)
					.then(() => {
						(setNodeSpy.calledOnce).should.be.true();
					});
			});

			it('should send the request again with the same arguments', () => {
				return handleSendRequestFailures.call(LSK, defaultMethod, defaultEndpoint, options, error)
					.then(() => {
						(sendRequestStub.calledWithExactly(defaultMethod, defaultEndpoint, options))
							.should.be.true();
					});
			});

			it('should resolve to the result of the request', () => {
				return handleSendRequestFailures.call(LSK, defaultMethod, defaultEndpoint, options, error)
					.then((result) => {
						(result).should.be.equal(sendRequestResult);
					});
			});
		});

		describe('if no redial is possible', () => {
			beforeEach(() => {
				checkReDialStub = sinon.stub(privateApi, 'checkReDial').returns(false);
			});

			afterEach(() => {
				checkReDialStub.restore();
			});

			it('should resolve to an object with success set to false', () => {
				return handleSendRequestFailures.call(LSK, defaultMethod, defaultEndpoint, options, error)
					.then((result) => {
						(result).should.have.property('success').and.be.equal(false);
					});
			});

			it('should resolve to an object with the provided error if no redial is possible', () => {
				return handleSendRequestFailures.call(LSK, defaultMethod, defaultEndpoint, options, error)
					.then((result) => {
						(result).should.have.property('error').and.be.equal(error);
					});
			});

			it('should resolve to an object with a helpful message', () => {
				return handleSendRequestFailures.call(LSK, defaultMethod, defaultEndpoint, options, error)
					.then((result) => {
						(result).should.have.property('message').and.be.equal('Could not create an HTTP request to any known peers.');
					});
			});
		});
	});

	describe('#optionallyCallCallback', () => {
		const { optionallyCallCallback } = privateApi;
		const result = 'result';
		const spy = sinon.spy();

		it('should return the result with a callback', () => {
			const returnValue = optionallyCallCallback(spy, result);
			(returnValue).should.equal(result);
		});

		it('should return the result without a callback', () => {
			const returnValue = optionallyCallCallback(undefined, result);
			(returnValue).should.equal(result);
		});

		it('should not call the callback if it is not a function', () => {
			(optionallyCallCallback.bind(null, { foo: 'bar' }, result)).should.not.throw();
		});

		it('should not call the callback if it is undefined', () => {
			(optionallyCallCallback.bind(null, undefined, result)).should.not.throw();
		});

		it('should call the callback with the result if callback is a function', () => {
			optionallyCallCallback(spy, result);
			(spy.calledWithExactly(result)).should.be.true();
		});
	});
});
