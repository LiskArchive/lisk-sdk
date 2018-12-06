import { expect } from 'chai';
import { Job } from '../src/job';
import { SinonFakeTimers } from 'sinon';

describe('job', () => {
    let jobStub: sinon.SinonStub;
    const context = {
        x: 1
    };

    const interval = 100000;

    beforeEach(async () => {
        jobStub = sandbox.stub().returns(1);
    });

    describe('#constructor', () => {
        it('should return a job instance', async () => {
            expect(new Job(context, jobStub, interval)).to.be.instanceof(Job);
        });
    });

    describe('#start', () => {
        let job: Job<number>;
        let clock: SinonFakeTimers;

        beforeEach(async () => {
            job = new Job(context, jobStub, interval);
            clock = sandbox.useFakeTimers();
        });

        it('should call the job stub', async () => {
            job.start();
            clock.tick(100000);
            expect(jobStub).to.be.calledOnce;
        });

        it('should set the context of the job correctly', async () => {
            job.start();
            clock.tick(1000000);
            expect(jobStub).to.be.calledOn(context);
        });

        it('should run the function again after interval', async () => {
            job.start();
            clock.tick(220000);
            expect(jobStub).to.be.calledTwice;
        });

        it('should set the id of the job', async () => {
            job.start();
            clock.tick(220000);
            expect((job as any)._id).to.exist;
        });
    });

    describe('#end', () => {
        let job: Job<number>;
        let clock: SinonFakeTimers;

        beforeEach(async () => {
            job = new Job(context, jobStub, interval);
            clock = sandbox.useFakeTimers();
        });

        it('should not run the job after stop is called', async () => {
            job.start();
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