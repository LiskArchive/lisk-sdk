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
import { Mutex } from '../../src/job_handlers/mutex';

describe('Mutex', () => {
	let mutex: Mutex;

	beforeEach(() => {
		mutex = new Mutex();
	});

	describe('#acquire', () => {
		it('should call function in order of acquired lock', async () => {
			const firstFunc = jest.fn();
			const secondFunc = jest.fn();
			const release = await mutex.acquire();
			await new Promise(resolve => {
				setTimeout(() => {
					firstFunc();
					resolve();
				}, 1000);
			});
			release();
			await mutex.acquire();
			await new Promise(resolve => {
				setTimeout(() => {
					secondFunc();
					resolve();
				}, 1);
			});
			release();

			expect(firstFunc).toHaveBeenCalled();
			expect(secondFunc).toHaveBeenCalled();
			expect(firstFunc).toHaveBeenCalledBefore(secondFunc);
		});
	});

	describe('#runExclusive', () => {
		it('should resolve to the result of the first function', async () => {
			const expectedResult = 'result';
			const resultPromise = mutex.runExclusive(async () => {
				return new Promise(resolve => {
					setTimeout(() => {
						return resolve(expectedResult);
					}, 10);
				});
			});
			const result = await resultPromise;
			expect(result).toEqual(expectedResult);
		});

		it('should resolve to the result of in sequence', async () => {
			const expectedResult1 = 'result1';
			const expectedResult2 = 'result2';
			const firstFn = jest.fn();
			const secondFn = jest.fn();
			const result1Promise = mutex.runExclusive(async () => {
				return new Promise(resolve => {
					setTimeout(() => {
						firstFn();
						return resolve(expectedResult1);
					}, 10);
				});
			});
			const result2Promise = mutex.runExclusive(async () => {
				return new Promise(resolve => {
					setTimeout(() => {
						secondFn();
						return resolve(expectedResult2);
					}, 2);
				});
			});

			const [result1, result2] = await Promise.all([result1Promise, result2Promise]);

			expect(result1).toEqual(expectedResult1);
			expect(result2).toEqual(expectedResult2);
			expect(firstFn).toHaveBeenCalledBefore(secondFn);
		});
	});

	describe('#runExclusiveWithTimeout', () => {
		it('should resolve to the result of the first function', async () => {
			const expectedResult = 'result';
			const resultPromise = mutex.runExclusiveWithTimeout(async () => {
				return new Promise(resolve => {
					setTimeout(() => {
						return resolve(expectedResult);
					}, 10);
				});
			}, 500);
			const result = await resultPromise;
			expect(result).toEqual(expectedResult);
		});

		it('should resolve to the result of in sequence', async () => {
			const expectedResult1 = 'result1';
			const expectedResult2 = 'result2';
			const firstFn = jest.fn();
			const secondFn = jest.fn();
			const result1Promise = mutex.runExclusiveWithTimeout(async () => {
				return new Promise(resolve => {
					setTimeout(() => {
						firstFn();
						return resolve(expectedResult1);
					}, 10);
				});
			}, 500);
			const result2Promise = mutex.runExclusiveWithTimeout(async () => {
				return new Promise(resolve => {
					setTimeout(() => {
						secondFn();
						return resolve(expectedResult2);
					}, 2);
				});
			}, 500);

			const [result1, result2] = await Promise.all([result1Promise, result2Promise]);

			expect(result1).toEqual(expectedResult1);
			expect(result2).toEqual(expectedResult2);
			expect(firstFn).toHaveBeenCalledBefore(secondFn);
		});

		it('should reject with error if function not completed in given time', async () => {
			const expectedResult = 'result';
			const resultPromise = mutex.runExclusiveWithTimeout(async () => {
				return new Promise(resolve => {
					setTimeout(() => {
						return resolve(expectedResult);
					}, 1000);
				});
			}, 500);
			await expect(resultPromise).rejects.toThrow(
				'Mutex run exclusive had been timeout for given 500ms',
			);
		});

		it('should reject with given error if function not completed in given time', async () => {
			const expectedResult = 'result';
			const resultPromise = mutex.runExclusiveWithTimeout(
				async () => {
					return new Promise(resolve => {
						setTimeout(() => {
							return resolve(expectedResult);
						}, 1000);
					});
				},
				500,
				'My Custom Error',
			);
			await expect(resultPromise).rejects.toThrow('My Custom Error');
		});
	});
});
