/*
 * Copyright © 2019 Lisk Foundation
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
import { P2PRequest, RequestOptions } from '../../src';

describe('p2p_request', () => {
	let requestOptions: RequestOptions;
	let respondCallback: (responseError?: Error, responseData?: unknown) => void;
	let request: P2PRequest;

	beforeEach(() => {
		requestOptions = {
			procedure: 'foo',
			data: 123,
			id: 'abc123',
			rate: 0,
			productivity: {
				requestCounter: 0,
				responseCounter: 0,
				responseRate: 0,
				lastResponded: 0,
			},
		};
		respondCallback = sandbox.stub();
		request = new P2PRequest(requestOptions, respondCallback);
	});

	describe('#constructor', () => {
		it('should have a procedure property which is set to the value specified in the constructor', () => {
			return expect(request)
				.to.have.property('procedure')
				.which.equals('foo');
		});

		it('should have a data property which is set to the value specified in the constructor', () => {
			return expect(request)
				.to.have.property('data')
				.which.equals(123);
		});

		it('should have a rate property which is set to the value specified in the constructor', () => {
			return expect(request)
				.to.have.property('rate')
				.which.equals(0);
		});

		it('should have a peerId property which is set to the value specified in the constructor', () => {
			return expect(request)
				.to.have.property('peerId')
				.which.equals('abc123');
		});

		it('should have a wasResponseSent property which is false', () => {
			return expect(request)
				.to.have.property('wasResponseSent')
				.which.equals(false);
		});

		it('should increment the productivity.requestCounter by 1', () => {
			return expect(requestOptions.productivity.requestCounter).to.equal(1);
		});

		it('should increment the productivity.requestCounter by 2 if a second P2PRequest instance is created with the same productivity tracker', () => {
			// P2PRequest instance can mutate the productivity tracker object.
			new P2PRequest(requestOptions, respondCallback);
			return expect(requestOptions.productivity.requestCounter).to.equal(2);
		});

		it('should initiate productivity.responseCounter with the value specified in the constructor', () => {
			return expect(requestOptions.productivity.responseCounter).to.equal(0);
		});
	});

	describe('#methods', () => {
		describe('#end', () => {
			let timeBeforeLastResponse: number;
			beforeEach(() => {
				timeBeforeLastResponse = Date.now();
				request.end('hello');
			});

			it('should send data back to callback in correct format', () => {
				return expect(respondCallback).to.be.calledOnceWith(undefined, {
					data: 'hello',
				});
			});

			it('should increment the productivity.responseCounter by 1', () => {
				return expect(requestOptions.productivity.responseCounter).to.equal(1);
			});

			it('should have a productivity.responseRate of 1; this indicates a success rate of 100%', () => {
				return expect(requestOptions.productivity.responseRate).to.equal(1);
			});

			it('should increment the productivity.responseCounter by 2 if a second P2PRequest instance is ended', () => {
				// P2PRequest instance can mutate the productivity tracker object.
				let secondP2PRequest = new P2PRequest(requestOptions, respondCallback);
				secondP2PRequest.end('world');

				return expect(requestOptions.productivity.responseCounter).to.equal(2);
			});

			it('should have a productivity.lastResponded which represents the time of the last successful response in milliseconds', () => {
				return expect(requestOptions.productivity.lastResponded).to.gte(
					timeBeforeLastResponse,
				);
			});
		});

		describe('#error', () => {
			let err = new Error('Custom error');
			err.name = 'CustomError';

			beforeEach(() => {
				request.error(err);
			});

			it('should send data back to callback in correct format', () => {
				return expect(respondCallback).to.be.calledOnceWith(err);
			});

			it('should not increment the productivity.responseCounter', () => {
				return expect(requestOptions.productivity.responseCounter).to.equal(0);
			});

			it('should have a productivity.responseRate of 0; this indicates a success rate of 0%', () => {
				return expect(requestOptions.productivity.responseRate).to.equal(0);
			});
		});

		describe('#mixed success and error', () => {
			let secondP2PRequest;
			let err = new Error('Custom error');
			err.name = 'CustomError';

			beforeEach(() => {
				request.end('hello');
				secondP2PRequest = new P2PRequest(requestOptions, respondCallback);
				secondP2PRequest.error(err);
			});

			it('should have a productivity.responseRate of 0.5; this indicates a success rate of 50%', () => {
				return expect(requestOptions.productivity.responseRate).to.equal(0.5);
			});
		});
	});
});
