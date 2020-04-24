/*
 * Copyright © 2020 Lisk Foundation
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
import { JobsQueue } from '../../../../../../../src/application/node/utils/jobs_queue';

describe('jobsQueue', () => {
	let jobsQueueStub: jest.Mock;
	const interval = 100000;

	beforeEach(() => {
		jobsQueueStub = jest.fn().mockReturnValue(1);
	});

	describe('#constructor', () => {
		it('should return a jobsQueue instance', () => {
			expect(new JobsQueue(jobsQueueStub, interval)).toBeInstanceOf(JobsQueue);
		});
	});

	describe('#start', () => {
		let jobsQueue: JobsQueue<number>;

		beforeEach(() => {
			jobsQueue = new JobsQueue(jobsQueueStub, interval);
			jest.useFakeTimers();
		});

		it('should call the jobsQueue stub', () => {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			jobsQueue.start();
			jest.advanceTimersByTime(interval + 1);
			expect(jobsQueueStub).toHaveBeenCalledTimes(1);
		});

		it('should run twice when interval is passed two times', async () => {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			jobsQueue.start();
			jest.advanceTimersByTime(interval + 1);
			return new Promise(resolve => {
				// need to use nextTick because jest.advanceTimersByTime calls the callbacks in setTimeout but does not resolve the wrapping promises.
				process.nextTick(() => {
					jest.advanceTimersByTime(interval + 1);
					expect(jobsQueueStub).toHaveBeenCalledTimes(2);
					resolve();
				});
			});
		});

		it('should set the id of the jobsQueue', () => {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			jobsQueue.start();
			jest.advanceTimersByTime(interval + 1);
			expect((jobsQueue as any)._id).toBeDefined();
		});

		it('should call this.run function only once on multiple start calls', () => {
			const runStub = jest.spyOn(jobsQueue as any, 'run');
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			jobsQueue.start();
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			jobsQueue.start();
			expect(runStub).toHaveBeenCalledTimes(1);
		});
	});

	describe('#end', () => {
		let jobsQueue: JobsQueue<number>;

		beforeEach(() => {
			jobsQueue = new JobsQueue(jobsQueueStub, interval);
			jest.useFakeTimers();
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			jobsQueue.start();
		});

		it('should not run the jobsQueue after stop is called', () => {
			jobsQueue.stop();
			jest.advanceTimersByTime(220000);
			expect(jobsQueueStub).not.toHaveBeenCalled();
		});

		it('should set the id of the jobsQueue to undefined', () => {
			jobsQueue.stop();
			expect((jobsQueue as any)._id).toBeFalsy();
		});
	});
});
