import { Job } from '../../src/job';

describe('job', () => {
	let jobStub: jest.Mock;
	const interval = 100000;

	beforeEach(async () => {
		jobStub = jest.fn().mockReturnValue(1);
	});

	describe('#constructor', () => {
		it('should return a job instance', async () => {
			expect(new Job(jobStub, interval)).toBeInstanceOf(Job);
		});
	});

	describe('#start', () => {
		let job: Job<number>;

		beforeEach(async () => {
			job = new Job(jobStub, interval);
			jest.useFakeTimers();
		});

		it('should call the job stub', async () => {
			job.start();
			jest.advanceTimersByTime(interval + 1);
			expect(jobStub).toBeCalledTimes(1);
		});

		it('should run twice when interval is passed two times', async () => {
			job.start();
			jest.advanceTimersByTime(interval + 1);
			return new Promise(resolve => {
				// need to use nextTick because jest.advanceTimersByTime calls the callbacks in setTimeout but does not resolve the wrapping promises.
				process.nextTick(() => {
					jest.advanceTimersByTime(interval + 1);
					expect(jobStub).toBeCalledTimes(2);
					resolve();
				});
			});
		});

		it('should set the id of the job', async () => {
			job.start();
			jest.advanceTimersByTime(interval + 1);
			expect((job as any)._id).toBeDefined();
		});

		it('should call this.run function only once on multiple start calls', () => {
			const runStub = jest.spyOn(job as any, 'run');
			job.start();
			job.start();
			expect(runStub).toBeCalledTimes(1);
		});
	});

	describe('#end', () => {
		let job: Job<number>;

		beforeEach(async () => {
			job = new Job(jobStub, interval);
			jest.useFakeTimers();
			job.start();
		});

		it('should not run the job after stop is called', async () => {
			job.stop();
			jest.advanceTimersByTime(220000);
			expect(jobStub).not.toBeCalled;
		});

		it('should set the id of the job to undefined', async () => {
			job.stop();
			expect((job as any)._id).toBeFalsy();
			return;
		});
	});
});
