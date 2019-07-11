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
 */

'use strict';

const {
	Sequence,
} = require('../../../../../../../src/modules/chain/utils/sequence');

describe('Sequence', () => {
	let sequence;

	beforeEach(async () => {
		jest.useFakeTimers();
		sequence = new Sequence();
	});

	describe('#constructor', () => {
		it('should have the default config', async () => {
			expect(sequence.config.warningLimit).toEqual(50);
			expect(sequence.config.onWarning).toEqual(null);
		});

		it('should call the _tick after event loop', async () => {
			const tickSpy = jest.spyOn(sequence, '_tick');
			jest.advanceTimersByTime(3);
			await expect(tickSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe('#count', () => {
		it('should register worker and count is correct', async () => {
			sequence.add(async () => true);
			sequence.add(async () => 1);
			sequence.add(async () => 'new');
			expect(sequence.count()).toEqual(3);
		});

		it('should register worker and count should decrease after tick', async () => {
			sequence.add(async () => true);
			sequence.add(async () => 1);
			sequence.add(async () => 'new');
			sequence._tick();
			expect(sequence.count()).toEqual(2);
		});
	});

	describe('#add', () => {
		it('should throw an error if the input is not async function', async () => {
			try {
				sequence.add(() => true);
			} catch (error) {
				expect(error.message).toEqual('Worker must be an async function.');
			}
		});

		it('should enqueue the input to the sequence', async () => {
			sequence.add(async () => true);
			expect(sequence.queue.length).toEqual(1);
		});
	});

	describe('#tick', () => {
		it('should resolve undefine when there is no task in the queue', async () => {
			const result = await sequence._tick();
			expect(result).toEqual(undefined);
		});

		it('should resolve to the result of the fist function ', async () => {
			const expectedResult = 'result';
			const resultPromise = sequence.add(async () => {
				return new Promise(resolve => {
					setTimeout(() => {
						return resolve(expectedResult);
					}, 10);
				});
			});
			jest.advanceTimersByTime(13);
			const result = await resultPromise;
			expect(result).toEqual(expectedResult);
		});

		it('should resolve to the result of in sequence', async () => {
			const expectedResult1 = 'result1';
			const expectedResult2 = 'result2';
			const result1Promise = sequence.add(async () => {
				return new Promise(resolve => {
					setTimeout(() => {
						return resolve(expectedResult1);
					}, 10);
				});
			});
			const result2Promise = sequence.add(async () => {
				return new Promise(resolve => {
					setTimeout(() => {
						return resolve(expectedResult2);
					}, 2);
				});
			});
			sequence._tick();
			sequence._tick();
			jest.runAllTimers();

			const [result1, result2] = await Promise.all([
				result1Promise,
				result2Promise,
			]);

			expect(result1).toEqual(expectedResult1);
			expect(result2).toEqual(expectedResult2);
		});
	});
});
