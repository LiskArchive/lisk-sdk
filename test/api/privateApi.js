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
import { PopsicleError } from 'popsicle';
import privateApi from '../../src/api/privateApi';
import utils from '../../src/api/utils';

describe('privateApi module @now', () => {
	const port = 7000;
	const localNode = 'localhost';
	const externalNode = 'external';
	const sslNode = 'sslPeer';
	const externalTestnetNode = 'testnet';
	const mainnetNethash = 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511';
	const testnetNethash = 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba';
	const GET = 'GET';
	const POST = 'POST';
	const defaultMethod = POST;
	const defaultEndpoint = 'transactions';
	const defaultData = 'testData';
	const defaultPeers = [localNode, externalNode];
	const defaultSSLPeers = [localNode, externalNode, sslNode];
	const defaultTestnetPeers = [localNode, externalTestnetNode];

	let LSK;
	let sendRequestResult;
	let sendRequestStub;

	beforeEach(() => {
		LSK = {
			randomPeer: false,
			currentPeer: localNode,
			defaultPeers: [].concat(defaultPeers),
			defaultSSLPeers: [].concat(defaultSSLPeers),
			defaultTestnetPeers: [].concat(defaultTestnetPeers),
			bannedPeers: [],
			port,
			options: {
				node: localNode,
			},
			nethash: {
				foo: 'bar',
			},

			parseOfflineRequests: () => ({
				requestMethod: GET,
			}),
			setTestnet: () => {},
			setNode: () => {},
			sendRequest: () => {},
		};
		sendRequestResult = { success: true, sendRequest: true };
		sendRequestStub = sinon.stub(LSK, 'sendRequest').resolves(Object.assign({}, sendRequestResult));
	});

	afterEach(() => {
		sendRequestStub.restore();
	});

	describe('#netHashOptions', () => {
		it('should have tests');
	});

	describe('#getURLPrefix', () => {
		const { getURLPrefix } = privateApi;

		it('should return http when ssl is set to false', () => {
			LSK.ssl = false;
			const result = getURLPrefix.call(LSK);
			(result).should.be.equal('http');
		});

		it('should return https when ssl is set to true', () => {
			LSK.ssl = true;
			const result = getURLPrefix.call(LSK);
			(result).should.be.equal('https');
		});
	});

	describe('#getFullURL', () => {
		const { getFullURL } = privateApi;
		const URLPrefix = 'ftp';

		let getURLPrefixStub;
		let restoreGetURLPrefixStub;
		let result;

		beforeEach(() => {
			getURLPrefixStub = sinon.stub().returns(URLPrefix);
			// eslint-disable-next-line no-underscore-dangle
			restoreGetURLPrefixStub = privateApi.__set__('getURLPrefix', getURLPrefixStub);
			result = getFullURL.call(LSK);
		});

		afterEach(() => {
			restoreGetURLPrefixStub();
		});

		it('should get the URL prefix', () => {
			(getURLPrefixStub.calledOn(LSK)).should.be.true();
		});

		it('should add the prefix to the node URL and the port', () => {
			(result).should.equal(`${URLPrefix}://${LSK.currentPeer}:${port}`);
		});

		it('should not include a port if not set', () => {
			delete LSK.port;
			result = getFullURL.call(LSK);
			(result).should.equal(`${URLPrefix}://${LSK.currentPeer}`);
		});
	});

	describe('#getPeers', () => {
		const { getPeers } = privateApi;

		describe('with SSL set to true', () => {
			beforeEach(() => {
				LSK.ssl = true;
			});

			it('should return default testnet peers if testnet is set to true', () => {
				LSK.testnet = true;
				const peers = getPeers.call(LSK);
				(peers).should.be.eql(defaultTestnetPeers);
			});

			it('should return default SSL peers if testnet is not set to true', () => {
				LSK.testnet = false;
				const peers = getPeers.call(LSK);
				(peers).should.be.eql(defaultSSLPeers);
			});
		});

		describe('with SSL set to false', () => {
			beforeEach(() => {
				LSK.ssl = false;
			});

			it('should return default testnet peers if testnet is set to true', () => {
				LSK.testnet = true;
				const peers = getPeers.call(LSK);
				(peers).should.be.eql(defaultTestnetPeers);
			});

			it('should return default mainnet peers if testnet is not set to true', () => {
				LSK.testnet = false;
				const peers = getPeers.call(LSK);
				(peers).should.be.eql(defaultPeers);
			});
		});
	});

	describe('#getRandomPeer', () => {
		const { getRandomPeer } = privateApi;
		let getPeersStub;
		let restoreGetPeersStub;

		beforeEach(() => {
			getPeersStub = sinon.stub().returns([].concat(defaultPeers));
			// eslint-disable-next-line no-underscore-dangle
			restoreGetPeersStub = privateApi.__set__('getPeers', getPeersStub);
		});

		afterEach(() => {
			restoreGetPeersStub();
		});

		it('should get peers', () => {
			getRandomPeer.call(LSK);
			(getPeersStub.calledOn(LSK));
		});

		it('should return a peer', () => {
			const result = getRandomPeer.call(LSK);
			(LSK.defaultPeers).should.containEql(result);
		});

		it('should randomly select the peer', () => {
			const firstResult = getRandomPeer.call(LSK);
			let nextResult = getRandomPeer.call(LSK);
			// Test will almost certainly time out if not random
			while (nextResult === firstResult) {
				nextResult = getRandomPeer.call(LSK);
			}
		});
	});

	describe('#selectNode', () => {
		it('should return the node from initial settings when set', () => {
			(privateApi.selectNode.call(LSK)).should.be.equal(localNode);
		});
	});

	describe('#banNode', () => {
		const { banNode } = privateApi;
		let currentNode;
		let selectNodeStub;
		let restoreSelectNodeStub;

		beforeEach(() => {
			selectNodeStub = sinon.stub();
			// eslint-disable-next-line no-underscore-dangle
			restoreSelectNodeStub = privateApi.__set__('selectNode', selectNodeStub);
			currentNode = LSK.currentPeer;
		});

		afterEach(() => {
			restoreSelectNodeStub();
		});

		it('should add current node to banned peers', () => {
			banNode.call(LSK);

			(LSK.bannedPeers).should.containEql(currentNode);
		});

		it('should not duplicate a banned peer', () => {
			const bannedPeers = [currentNode];
			LSK.bannedPeers = bannedPeers;
			banNode.call(LSK);

			(LSK.bannedPeers).should.be.eql(bannedPeers);
		});

		it('should select a node', () => {
			banNode.call(LSK);

			(selectNodeStub.calledOn(LSK)).should.be.true();
		});
	});

	describe('#checkReDial', () => {
		const { checkReDial } = privateApi;
		let getPeersStub;
		let restoreGetPeersStub;
		let netHashOptionsStub;
		let setTestnetStub;

		beforeEach(() => {
			getPeersStub = sinon.stub().returns([].concat(defaultPeers));
			// eslint-disable-next-line no-underscore-dangle
			restoreGetPeersStub = privateApi.__set__('getPeers', getPeersStub);
			netHashOptionsStub = sinon.stub(privateApi, 'netHashOptions');
			setTestnetStub = sinon.stub(LSK, 'setTestnet');
		});

		afterEach(() => {
			restoreGetPeersStub();
			netHashOptionsStub.restore();
			setTestnetStub.restore();
		});

		describe('with random peer', () => {
			let result;

			beforeEach(() => {
				LSK.randomPeer = true;
			});

			it('should get peers', () => {
				checkReDial.call(LSK);
				(getPeersStub.calledOn(LSK)).should.be.true();
			});

			describe('when nethash is set', () => {
				describe('when the nethash matches the testnet', () => {
					beforeEach(() => {
						LSK.options.nethash = testnetNethash;
						result = checkReDial.call(LSK);
					});

					it('should set testnet to true', () => {
						(setTestnetStub.calledOn(LSK)).should.be.true();
						(setTestnetStub.calledWithExactly(true)).should.be.true();
					});

					it('should return true', () => {
						(result).should.be.true();
					});
				});

				describe('when the nethash matches the mainnet', () => {
					beforeEach(() => {
						LSK.options.nethash = mainnetNethash;
						result = checkReDial.call(LSK);
					});

					it('should set testnet to false', () => {
						(setTestnetStub.calledOn(LSK)).should.be.true();
						(setTestnetStub.calledWithExactly(false)).should.be.true();
					});

					it('should return true', () => {
						(result).should.be.true();
					});
				});

				describe('when the nethash matches neither the mainnet nor the testnet', () => {
					beforeEach(() => {
						LSK.options.nethash = 'abc123';
						result = checkReDial.call(LSK);
					});

					it('should return false', () => {
						(result).should.be.false();
					});
				});
			});

			describe('when nethash is not set', () => {
				beforeEach(() => {
					LSK.options.nethash = undefined;
				});

				it('should return true if there are peers which are not banned', () => {
					LSK.bannedPeers = ['bannedPeer'].concat(LSK.defaultPeers.slice(1));
					result = checkReDial.call(LSK);

					(result).should.be.true();
				});

				it('should return false if there are no peers which are not banned', () => {
					LSK.bannedPeers = [].concat(LSK.defaultPeers);
					result = checkReDial.call(LSK);

					(result).should.be.false();
				});
			});
		});

		describe('without random peer', () => {
			beforeEach(() => {
				LSK.randomPeer = false;
			});

			it('should return false', () => {
				const result = checkReDial.call(LSK);
				(result).should.be.false();
			});
		});
	});

	describe('#checkOptions', () => {
		const { checkOptions } = privateApi;
		const goodOptions = {
			key1: 'value 1',
			key2: 2,
		};

		it('should throw an error if any option is undefined', () => {
			const optionsWithUndefined = Object.assign({
				badKey: undefined,
			}, goodOptions);

			(checkOptions.bind(null, optionsWithUndefined)).should.throw('"badKey" option should not be undefined');
		});

		it('should throw an error if any option is NaN', () => {
			const optionsWithNaN = Object.assign({
				badKey: NaN,
			}, goodOptions);

			(checkOptions.bind(null, optionsWithNaN)).should.throw('"badKey" option should not be NaN');
		});

		it('should return the options if they are all ok', () => {
			const result = checkOptions(Object.assign({}, goodOptions));
			(result).should.be.eql(goodOptions);
		});
	});

	describe('#serialiseHTTPData', () => {
		const { serialiseHTTPData } = privateApi;
		const queryStringData = 'key%2F1=value%20%252&key3=4';

		let data;
		let trimmedData;
		let trimObjStub;
		let toQueryStringStub;
		let serialisedData;

		beforeEach(() => {
			data = {
				' key/1 ': '  value %2',
				key3: 4,
			};
			trimmedData = {
				'key%2F': 'value%20%252',
				key3: 4,
			};
			trimObjStub = sinon.stub(utils, 'trimObj').returns(trimmedData);
			toQueryStringStub = sinon.stub(utils, 'toQueryString').returns(queryStringData);
			serialisedData = serialiseHTTPData(data);
		});

		afterEach(() => {
			trimObjStub.restore();
			toQueryStringStub.restore();
		});

		it('should trim the object', () => {
			(trimObjStub.calledWithExactly(data)).should.be.true();
		});

		it('should convert the trimmed object to a query string', () => {
			(toQueryStringStub.calledWithExactly(trimmedData)).should.be.true();
		});

		it('should prepend a question mark to the query string', () => {
			(serialisedData).should.equal(`?${queryStringData}`);
		});
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

			const requestObject = privateApi.createRequestObject.call(LSK, GET, defaultEndpoint, options);
			(requestObject).should.be.eql(expectedObject);
		});

		it('should create a valid request object for POST request', () => {
			expectedObject.body = Object.assign({}, options);
			expectedObject.method = POST;

			const requestObject = privateApi.createRequestObject
				.call(LSK, POST, defaultEndpoint, options);
			(requestObject).should.be.eql(expectedObject);
		});

		it('should create a valid request object for POST request without options', () => {
			expectedObject.method = POST;

			const requestObject = privateApi.createRequestObject.call(LSK, POST, defaultEndpoint);
			(requestObject).should.be.eql(expectedObject);
		});

		it('should create a valid request object for undefined request method without options', () => {
			expectedObject.method = undefined;

			const requestObject = privateApi.createRequestObject.call(LSK, undefined, defaultEndpoint);
			(requestObject).should.be.eql(expectedObject);
		});
	});

	describe('#constructRequestData', () => {
		const address = '18160565574430594874L';
		const customAddress = '123l';
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
			address: customAddress,
			limit: 4,
			offset: 5,
		};
		const resolvedConflictObject = {
			address: customAddress,
			limit: defaultRequestLimit,
			offset: defaultRequestOffset,
		};

		it('should merge a data object with an options object', () => {
			const requestData = privateApi.constructRequestData({ address }, optionsObject);
			(requestData).should.be.eql(expectedObject);
		});

		it('should recognise when a callback function is passed instead of an options object', () => {
			const providedObj = { address };
			const requestData = privateApi.constructRequestData(providedObj, () => true);
			(requestData).should.be.eql(providedObj);
		});

		it('should prioritise values from the data object when the data object and options object conflict', () => {
			const requestData = privateApi.constructRequestData(
				{ limit: defaultRequestLimit, offset: defaultRequestOffset }, optionsWithConflictObject,
			);
			(requestData).should.be.eql(resolvedConflictObject);
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
			createRequestObjectStub = sinon.stub().returns(Object.assign({}, createRequestObjectResult));
			// eslint-disable-next-line no-underscore-dangle
			restoreCreateRequestObject = privateApi.__set__('createRequestObject', createRequestObjectStub);
			sendRequestPromiseResult = sendRequestPromise
				.call(LSK, defaultMethod, defaultEndpoint, options)
				.catch(result => result);
			return sendRequestPromiseResult;
		});

		afterEach(() => {
			restoreCreateRequestObject();
		});

		it('should create a request object', () => {
			(createRequestObjectStub.calledOn(LSK)).should.be.true();
			(createRequestObjectStub.calledWithExactly(defaultMethod, defaultEndpoint, options))
				.should.be.true();
		});

		it('should return the result of a popsicle request', () => {
			return sendRequestPromiseResult
				.then((result) => {
					(result).should.be.instanceof(PopsicleError);
				});
		});
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
						(result).should.be.eql(sendRequestResult);
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

	describe('#handleSendRequestFailures', () => {
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
						(result).should.be.eql(sendRequestResult);
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
