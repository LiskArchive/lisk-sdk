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
 */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { JobQueue } from '../../src/job_handlers/job_queue';

describe('JobQueue', () => {
	jest.useFakeTimers();

	let sequence: JobQueue;

	beforeEach(() => {
		sequence = new JobQueue();
	});

	describe('#constructor', () => {
		it('should have the default config', () => {
			expect(sequence['_config'].warningLimit).toEqual(50);
			expect(sequence['_config'].onWarning).toBeUndefined();
		});

		it('should call the _tick after event loop', () => {
			const tickSpy = jest.spyOn(sequence, '_tick' as any);
			jest.advanceTimersByTime(3);
			expect(tickSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe('#count', () => {
		it('should register worker and count is correct', () => {
			sequence.add(async () => Promise.resolve(true));
			sequence.add(async () => Promise.resolve(1));
			sequence.add(async () => Promise.resolve('new'));
			expect(sequence.count()).toEqual(3);
		});

		it('should register worker and count should decrease after tick', () => {
			sequence.add(async () => Promise.resolve(true));
			sequence.add(async () => Promise.resolve(1));
			sequence.add(async () => Promise.resolve('new'));
			sequence['_tick']();
			expect(sequence.count()).toEqual(2);
		});
	});

	describe('#add', () => {
		it('should throw an error if the input is not async function', async () => {
			await expect(sequence.add((() => true) as any)).rejects.toThrow(
				'Worker must be an async function.',
			);
		});

		it('should enqueue the input to the sequence', () => {
			sequence.add(async () => Promise.resolve(true));
			expect(sequence['_queue']).toHaveLength(1);
		});
	});

	describe('#tick', () => {
		it('should resolve undefined when there is no task in the queue', async () => {
			const result = await sequence['_tick']();
			expect(result).toBeUndefined();
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
			sequence['_tick']();
			sequence['_tick']();
			jest.runAllTimers();

			const [result1, result2] = await Promise.all([result1Promise, result2Promise]);

			expect(result1).toEqual(expectedResult1);
			expect(result2).toEqual(expectedResult2);
		});
	});
});
