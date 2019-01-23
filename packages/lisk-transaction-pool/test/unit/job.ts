import { expect } from 'chai';
import { Job } from '../../src/job';
import { SinonFakeTimers } from 'sinon';

describe('job', () => {
	let jobStub: sinon.SinonStub;
	const interval = 100000;

	beforeEach(async () => {
		jobStub = sandbox.stub().returns(1);
	});

	describe('#constructor', () => {
		it('should return a job instance', async () => {
			expect(new Job(jobStub, interval)).to.be.instanceof(Job);
		});
	});

	describe('#start', () => {
		let job: Job<number>;
		let clock: SinonFakeTimers;

		beforeEach(async () => {
			job = new Job(jobStub, interval);
			clock = sandbox.useFakeTimers();
		});

		it('should call the job stub', async () => {
			job.start();
			clock.tick(interval + 1);
			expect(jobStub).to.be.calledOnce;
		});

		it('should run twice when interval is passed two times', async () => {
			job.start();
			clock.tick(interval + 1);
			return new Promise(resolve => {
				// need to use nextTick because clock.tick calls the callbacks in setTimeout but does not resolve the wrapping promises.
				process.nextTick(() => {
					clock.tick(interval + 1);
					expect(jobStub).to.be.calledTwice;
					resolve();
				});
			});
		});

		it('should set the id of the job', async () => {
			job.start();
			clock.tick(interval + 1);
			expect((job as any)._id).to.exist;
		});

		it('should call this.run function only once on multiple start calls', () => {
			const runStub = sandbox.stub(job as any, 'run');
			job.start();
			job.start();
			expect(runStub).to.be.calledOnce;
		});
	});

	describe('#end', () => {
		let job: Job<number>;
		let clock: SinonFakeTimers;

		beforeEach(async () => {
			job = new Job(jobStub, interval);
			clock = sandbox.useFakeTimers();
			job.start();
		});

		it('should not run the job after stop is called', async () => {
			job.stop();
			clock.tick(220000);
			expect(jobStub).to.not.be.called;
		});

		it('should set the id of the job to undefined', async () => {
			job.stop();
			expect((job as any)._id).to.not.exist;
			return;
		});
	});
});
