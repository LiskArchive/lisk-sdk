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

afterEach(() => sandbox.restore());

describe('api utils module', () => {
	const POST = 'POST';
	const defaultMethod = POST;
	const defaultEndpoint = 'transactions';

	let LSK;
	let sendRequestResult;
	let sendRequestStub;

	beforeEach(() => {
		LSK = {
			sendRequest: () => {},
		};
		sendRequestResult = { success: true, sendRequest: true };
		sendRequestStub = sandbox
			.stub(LSK, 'sendRequest')
			.resolves(Object.assign({}, sendRequestResult));
	});

	describe('#trimObj', () => {
		const { trimObj } = utils;

		it('should not trim strings', () => {
			const str = '  string ';
			const trimmedString = trimObj(str);
			trimmedString.should.be.equal(str);
		});

		it('should convert integers to strings', () => {
			const trimmedInteger = trimObj(123);
			trimmedInteger.should.be.eql('123');
		});

		it('should convert nested integers to strings', () => {
			const trimmedObject = trimObj({ myObj: 2 });
			trimmedObject.should.be.eql({ myObj: '2' });
		});

		it('should remove whitespace from keys and values', () => {
			const trimmedObject = trimObj({ '  my_Obj ': '  my val ' });
			trimmedObject.should.be.eql({ my_Obj: 'my val' }); // eslint-disable-line camelcase
		});

		it('should trim each member of an array', () => {
			const trimmedArray = trimObj([
				'  string ',
				{ ' key  ': ' value   ' },
				['  array item '],
			]);
			trimmedArray.should.be.eql(['string', { key: 'value' }, ['array item']]);
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
			queryString.should.be.equal('key1=value1&key2=value2&key3=value3');
		});

		it('should escape invalid special characters', () => {
			const queryString = toQueryString({
				'key:/;?': 'value:/;?',
			});
			queryString.should.be.equal('key%3A%2F%3B%3F=value%3A%2F%3B%3F');
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

			checkOptions
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

			checkOptions
				.bind(null, optionsWithNaN)
				.should.throw('"badKey" option should not be NaN');
		});

		it('should return the options if they are all ok', () => {
			const result = checkOptions(Object.assign({}, goodOptions));
			result.should.be.eql(goodOptions);
		});
	});

	describe('#serialiseHTTPData', () => {
		const { serialiseHTTPData } = utils;
		const queryStringData = 'key%2F1=value%20%252&key3=4';

		let data;
		let serialisedData;

		beforeEach(() => {
			data = {
				' key/1 ': '  value %2',
				key3: 4,
			};
			serialisedData = serialiseHTTPData(data);
		});

		it('should trim, escape, and prepend a question mark to the query string', () => {
			serialisedData.should.equal(`?${queryStringData}`);
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
			returnedFunction.should.be.type('function');
		});

		describe('returned function', () => {
			it('should call the provided getData function on the provided value and options', () => {
				return returnedFunction.call(LSK, value, options).then(() => {
					getDataFnStub.calledWithExactly(value, options).should.be.true();
				});
			});

			it('should construct request data using the provided data and options', () => {
				return returnedFunction.call(LSK, value, options).then(() => {
					constructRequestDataStub
						.calledWithExactly(getDataFnResult, options)
						.should.be.true();
				});
			});

			it('should send a request with the constructed data and a callback if options are provided', () => {
				return returnedFunction.call(LSK, value, options, callback).then(() => {
					sendRequestStub
						.calledWithExactly(
							defaultMethod,
							defaultEndpoint,
							constructRequestDataResult,
							callback,
						)
						.should.be.true();
				});
			});

			it('should send a request with the constructed data and a callback if options are not provided', () => {
				return returnedFunction.call(LSK, value, callback).then(() => {
					sendRequestStub
						.calledWithExactly(
							defaultMethod,
							defaultEndpoint,
							constructRequestDataResult,
							callback,
						)
						.should.be.true();
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
			requestData.should.be.eql(expectedObject);
		});

		it('should recognise when a callback function is passed instead of an options object', () => {
			const providedObj = { address };
			const requestData = utils.constructRequestData(providedObj, () => true);
			requestData.should.be.eql(providedObj);
		});

		it('should prioritise values from the data object when the data object and options object conflict', () => {
			const requestData = utils.constructRequestData(
				{ limit: defaultRequestLimit, offset: defaultRequestOffset },
				optionsWithConflictObject,
			);
			requestData.should.be.eql(resolvedConflictObject);
		});
	});

	describe('#optionallyCallCallback', () => {
		const { optionallyCallCallback } = utils;
		const result = 'result';
		const spy = sandbox.spy();

		it('should return the result with a callback', () => {
			const returnValue = optionallyCallCallback(spy, result);
			returnValue.should.equal(result);
		});

		it('should return the result without a callback', () => {
			const returnValue = optionallyCallCallback(undefined, result);
			returnValue.should.equal(result);
		});

		it('should not call the callback if it is not a function', () => {
			optionallyCallCallback
				.bind(null, { foo: 'bar' }, result)
				.should.not.throw();
		});

		it('should not call the callback if it is undefined', () => {
			optionallyCallCallback.bind(null, undefined, result).should.not.throw();
		});

		it('should call the callback with the result if callback is a function', () => {
			optionallyCallCallback(spy, result);
			spy.calledWithExactly(result).should.be.true();
		});
	});
});
