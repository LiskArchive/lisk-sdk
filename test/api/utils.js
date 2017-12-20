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
const utils = require('../../src/api/utils');

describe('api utils module', () => {
	const POST = 'POST';
	const defaultMethod = POST;
	const defaultEndpoint = 'transactions';
	const defaultPort = 7000;

	let LSK;
	let sendRequestResult;
	let sendRequestStub;

	beforeEach(() => {
		LSK = {
			port: defaultPort,
			sendRequest: () => {},
		};
		sendRequestResult = { success: true, sendRequest: true };
		sendRequestStub = sandbox
			.stub(LSK, 'sendRequest')
			.resolves(Object.assign({}, sendRequestResult));
	});

	describe('#netHashOptions', () => {
		const { netHashOptions } = utils;
		let result;

		beforeEach(() => {
			result = netHashOptions({ port: defaultPort });
		});

		it('should return an object with a testnet nethash', () => {
			const { testnet } = result;
			testnet.should.have.property('Content-Type').and.be.type('string');
			testnet.should.have.property('nethash').and.be.type('string');
			testnet.should.have.property('broadhash').and.be.type('string');
			testnet.should.have.property('os').and.be.type('string');
			testnet.should.have.property('version').and.be.type('string');
			testnet.should.have.property('minVersion').and.be.type('string');
			return testnet.should.have.property('port').and.be.type('number');
		});
		it('should return an object with a mainnet nethash', () => {
			const { mainnet } = result;
			mainnet.should.have.property('Content-Type').and.be.type('string');
			mainnet.should.have.property('nethash').and.be.type('string');
			mainnet.should.have.property('broadhash').and.be.type('string');
			mainnet.should.have.property('os').and.be.type('string');
			mainnet.should.have.property('version').and.be.type('string');
			mainnet.should.have.property('minVersion').and.be.type('string');
			return mainnet.should.have.property('port').and.be.type('number');
		});
	});

	describe('#getURLPrefix', () => {
		const { getURLPrefix } = utils;

		it('should return http when ssl is set to false', () => {
			const ssl = false;
			const result = getURLPrefix({ ssl });
			return result.should.be.equal('http');
		});

		it('should return https when ssl is set to true', () => {
			const ssl = true;
			const result = getURLPrefix({ ssl });
			return result.should.be.equal('https');
		});
	});

	describe('#getFullURL', () => {
		const { getFullURL } = utils;
		const URLPrefix = 'ftp';

		let getURLPrefixStub;
		let restoreGetURLPrefixStub;
		let result;

		beforeEach(() => {
			getURLPrefixStub = sandbox.stub().returns(URLPrefix);
			// eslint-disable-next-line no-underscore-dangle
			restoreGetURLPrefixStub = utils.__set__('getURLPrefix', getURLPrefixStub);
			result = getFullURL(LSK);
		});

		afterEach(() => {
			restoreGetURLPrefixStub();
		});

		it('should get the URL prefix', () => {
			const { ssl } = LSK;
			return getURLPrefixStub.should.be.calledWithExactly({ ssl });
		});

		it('should add the prefix to the node URL and the port', () => {
			return result.should.equal(`${URLPrefix}://${LSK.node}:${defaultPort}`);
		});

		it('should not include a port if not set', () => {
			delete LSK.port;
			result = getFullURL(LSK);
			return result.should.equal(`${URLPrefix}://${LSK.node}`);
		});
	});

	describe('#toQueryString', () => {
		const { toQueryString } = utils;

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

	describe('#checkOptions', () => {
		const { checkOptions } = utils;
		const goodOptions = {
			key1: 'value 1',
			key2: 2,
		};

		it('should throw an error if any option is undefined', () => {
			const optionsWithUndefined = Object.assign(
				{
					badKey: undefined,
				},
				goodOptions,
			);

			return checkOptions
				.bind(null, optionsWithUndefined)
				.should.throw('"badKey" option should not be undefined');
		});

		it('should throw an error if any option is NaN', () => {
			const optionsWithNaN = Object.assign(
				{
					badKey: NaN,
				},
				goodOptions,
			);

			return checkOptions
				.bind(null, optionsWithNaN)
				.should.throw('"badKey" option should not be NaN');
		});

		it('should return the options if they are all ok', () => {
			const result = checkOptions(Object.assign({}, goodOptions));
			return result.should.be.eql(goodOptions);
		});
	});

	describe('#wrapSendRequest', () => {
		const { wrapSendRequest } = utils;
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
			getDataFnStub = sandbox
				.stub()
				.returns(Object.assign({}, getDataFnResult));
			constructRequestDataStub = sandbox
				.stub()
				.returns(Object.assign({}, constructRequestDataResult));
			// eslint-disable-next-line no-underscore-dangle
			restoreConstructRequestDataStub = utils.__set__(
				'constructRequestData',
				constructRequestDataStub,
			);
			returnedFunction = wrapSendRequest(
				defaultMethod,
				defaultEndpoint,
				getDataFnStub,
			);
			callback = () => {};
		});

		afterEach(() => {
			restoreConstructRequestDataStub();
		});

		it('should return a function', () => {
			return returnedFunction.should.be.type('function');
		});

		describe('returned function', () => {
			it('should call the provided getData function on the provided value and options', () => {
				return returnedFunction.call(LSK, value, options).then(() => {
					getDataFnStub.should.be.calledWithExactly(value, options);
				});
			});

			it('should construct request data using the provided data and options', () => {
				return returnedFunction.call(LSK, value, options).then(() => {
					constructRequestDataStub.should.be.calledWithExactly(
						getDataFnResult,
						options,
					);
				});
			});

			it('should send a request with the constructed data and a callback if options are provided', () => {
				return returnedFunction.call(LSK, value, options, callback).then(() => {
					sendRequestStub.should.be.calledWithExactly(
						defaultMethod,
						defaultEndpoint,
						constructRequestDataResult,
						callback,
					);
				});
			});

			it('should send a request with the constructed data and a callback if options are not provided', () => {
				return returnedFunction.call(LSK, value, callback).then(() => {
					sendRequestStub.should.be.calledWithExactly(
						defaultMethod,
						defaultEndpoint,
						constructRequestDataResult,
						callback,
					);
				});
			});

			it('should return the result of the sent request', () => {
				return returnedFunction.call(LSK, value, callback).then(result => {
					result.should.be.eql(sendRequestResult);
				});
			});
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
			const requestData = utils.constructRequestData(
				{ address },
				optionsObject,
			);
			return requestData.should.be.eql(expectedObject);
		});

		it('should recognise when a callback function is passed instead of an options object', () => {
			const providedObj = { address };
			const requestData = utils.constructRequestData(providedObj, () => true);
			return requestData.should.be.eql(providedObj);
		});

		it('should prioritise values from the data object when the data object and options object conflict', () => {
			const requestData = utils.constructRequestData(
				{ limit: defaultRequestLimit, offset: defaultRequestOffset },
				optionsWithConflictObject,
			);
			return requestData.should.be.eql(resolvedConflictObject);
		});
	});

	describe('#optionallyCallCallback', () => {
		const { optionallyCallCallback } = utils;
		const result = 'result';
		const spy = sandbox.spy();

		it('should return the result with a callback', () => {
			const returnValue = optionallyCallCallback(spy, result);
			return returnValue.should.equal(result);
		});

		it('should return the result without a callback', () => {
			const returnValue = optionallyCallCallback(undefined, result);
			return returnValue.should.equal(result);
		});

		it('should not call the callback if it is not a function', () => {
			return optionallyCallCallback
				.bind(null, { foo: 'bar' }, result)
				.should.not.throw();
		});

		it('should not call the callback if it is undefined', () => {
			return optionallyCallCallback
				.bind(null, undefined, result)
				.should.not.throw();
		});

		it('should call the callback with the result if callback is a function', () => {
			optionallyCallCallback(spy, result);
			return spy.should.be.calledWithExactly(result);
		});
	});
});
