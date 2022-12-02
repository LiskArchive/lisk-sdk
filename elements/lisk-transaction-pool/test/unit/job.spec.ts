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
import { Job } from '../../src/job';

describe('job', () => {
	let jobStub: jest.Mock;
	const interval = 100000;

	beforeEach(() => {
		jobStub = jest.fn().mockReturnValue(1);
	});

	describe('#constructor', () => {
		it('should return a job instance', () => {
			expect(new Job(jobStub, interval)).toBeInstanceOf(Job);
		});
	});

	describe('#start', () => {
		let job: Job<number>;

		beforeEach(() => {
			job = new Job(jobStub, interval);
			jest.useFakeTimers();
		});

		it('should call the job stub', () => {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			job.start();
			jest.advanceTimersByTime(interval + 1);
			expect(jobStub).toHaveBeenCalledTimes(1);
		});

		// FIXME: Jest changed the structure of fake timer. It needs another approach to test this
		// eslint-disable-next-line jest/no-disabled-tests
		it.skip('should run twice when interval is passed two times', async () => {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			job.start();
			jest.advanceTimersByTime(interval + 1);
			return new Promise<void>(resolve => {
				// need to use nextTick because jest.advanceTimersByTime calls the callbacks in setTimeout but does not resolve the wrapping promises.
				process.nextTick(() => {
					jest.advanceTimersByTime(interval + 1);
					expect(jobStub).toHaveBeenCalledTimes(2);
					resolve();
				});
			});
		});

		it('should set the id of the job', () => {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			job.start();
			jest.advanceTimersByTime(interval + 1);
			expect((job as any)._id).toBeDefined();
		});

		it('should call this.run function only once on multiple start calls', () => {
			const runStub = jest.spyOn(job as any, 'run');
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			job.start();
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			job.start();
			expect(runStub).toHaveBeenCalledTimes(1);
		});
	});

	describe('#end', () => {
		let job: Job<number>;

		beforeEach(() => {
			job = new Job(jobStub, interval);
			jest.useFakeTimers();
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			job.start();
		});

		it('should not run the job after stop is called', () => {
			job.stop();
			jest.advanceTimersByTime(220000);
			expect(jobStub).not.toHaveBeenCalled();
		});

		it('should set the id of the job to undefined', () => {
			job.stop();
			expect((job as any)._id).toBeFalsy();
		});
	});
});
