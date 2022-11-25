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
import { P2PRequest } from '../../src/p2p_request';
import { RPCResponseAlreadySentError } from '../../src/errors';
import { RequestOptions } from '../../src/types';
import { DEFAULT_MESSAGE_ENCODING_FORMAT } from '../../src/constants';

describe('p2pRequest', () => {
	let requestOptions: RequestOptions;
	let respondCallback: (responseError?: Error, responseData?: unknown) => void;
	let request: P2PRequest;

	beforeEach(() => {
		requestOptions = {
			procedure: 'foo',
			data: 'bar',
			id: 'abc123',
			rate: 0,
			productivity: {
				requestCounter: 0,
				responseCounter: 0,
				responseRate: 0,
				lastResponded: 0,
			},
		};
		respondCallback = jest.fn();
		request = new P2PRequest(requestOptions, respondCallback);
	});

	describe('#constructor', () => {
		it('should increment the productivity.requestCounter by 1', () =>
			expect(requestOptions.productivity.requestCounter).toBe(1));

		it('should increment the productivity.requestCounter by 2 if a second P2PRequest instance is created with the same productivity tracker', () => {
			// P2PRequest instance can mutate the productivity tracker object.
			// eslint-disable-next-line no-new
			new P2PRequest(requestOptions, respondCallback);
			expect(requestOptions.productivity.requestCounter).toBe(2);
		});

		it('should initiate productivity.responseCounter with the value specified in the constructor', () =>
			expect(requestOptions.productivity.responseCounter).toBe(0));
	});

	describe('#procedure', () => {
		it('should have a procedure property which is set to the value specified in the constructor', () =>
			expect(request.procedure).toBe('foo'));
	});

	describe('#data', () => {
		it('should have a data property which is set to the value specified in the constructor', () =>
			expect(request.data).toEqual(Buffer.from('bar', DEFAULT_MESSAGE_ENCODING_FORMAT)));
	});

	describe('#rate', () => {
		it('should have a rate property which is set to the value specified in the constructor', () =>
			expect(request.rate).toBe(0));
	});

	describe('#peerId', () => {
		it('should have a peerId property which is set to the value specified in the constructor', () =>
			expect(request.peerId).toBe('abc123'));
	});

	describe('#wasResponseSent', () => {
		it('should have a wasResponseSent property which is false', () =>
			expect(request.wasResponseSent).toBe(false));
	});

	describe('#end', () => {
		let timeBeforeLastResponse: number;
		beforeEach(() => {
			timeBeforeLastResponse = Date.now();
			request.end('hello');
		});

		it('should send data back to callback in correct format', () => {
			expect(respondCallback).toHaveBeenCalledTimes(1);
			expect(respondCallback).toHaveBeenCalledWith(undefined, {
				data: request['_getBase64Data']('hello'),
				peerId: requestOptions.id,
			});
		});

		it('should increment the productivity.responseCounter by 1', () =>
			expect(requestOptions.productivity.responseCounter).toBe(1));

		it('should have a productivity.responseRate of 1; this indicates a success rate of 100%', () =>
			expect(requestOptions.productivity.responseRate).toBe(1));

		it('should increment the productivity.responseCounter by 2 if a second P2PRequest instance is ended', () => {
			// P2PRequest instance can mutate the productivity tracker object.
			const secondP2PRequest = new P2PRequest(requestOptions, respondCallback);
			secondP2PRequest.end('world');

			expect(requestOptions.productivity.responseCounter).toBe(2);
		});

		it('should have a productivity.lastResponded which represents the time of the last successful response in milliseconds', () =>
			expect(requestOptions.productivity.lastResponded).toBeGreaterThanOrEqual(
				timeBeforeLastResponse,
			));

		it('should set wasResponseSent property to true', () => {
			expect(request).toMatchObject({
				_data: Buffer.from('bar', DEFAULT_MESSAGE_ENCODING_FORMAT),
				_peerId: 'abc123',
				_procedure: 'foo',
				_rate: 0,
				_respondCallback: expect.any(Function),
				_wasResponseSent: true,
			});
		});

		it('should throw error when sending another request', () =>
			expect(() => request.end('hello')).toThrow(RPCResponseAlreadySentError));
	});

	describe('#error', () => {
		const err = new Error('Custom error');
		err.name = 'CustomError';
		describe('when there was not a previous success', () => {
			beforeEach(() => request.error(err));

			it('should send data back to callback in correct format', () => {
				expect(respondCallback).toHaveBeenCalledTimes(1);
				expect(respondCallback).toHaveBeenCalledWith(err, undefined);
			});

			it('should not increment the productivity.responseCounter', () =>
				expect(requestOptions.productivity.responseCounter).toBe(0));

			it('should have a productivity.responseRate of 0; this indicates a success rate of 0%', () =>
				expect(requestOptions.productivity.responseRate).toBe(0));
		});

		describe('when there was a previous success', () => {
			it('should have a productivity.responseRate of 0.5; this indicates a success rate of 50%', () => {
				request.end('hello');
				const secondP2PRequest = new P2PRequest(requestOptions, respondCallback);
				secondP2PRequest.error(err);

				expect(requestOptions.productivity.responseRate).toBe(0.5);
			});
		});
	});
});
