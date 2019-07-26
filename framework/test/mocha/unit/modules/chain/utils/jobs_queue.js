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

'use strict';

const jobsQueue = require('../../../../../../src/modules/chain/utils/jobs_queue');

// These tests are breaking other tests (relying on setTimeout) running on the same process because of a time stubbing
describe('helpers/jobsQueue', () => {
	// Test global variables
	let recallInterval = 1000;
	let execTimeInterval = 1;

	describe('register', () => {
		describe('should throw an erorr', () => {
			let validFunction;

			beforeEach(done => {
				validFunction = sinonSandbox.spy();
				done();
			});

			afterEach(done => {
				expect(validFunction.notCalled).to.be.true;
				done();
			});

			it('should throw an error when trying to pass name that is not a string', async () =>
				expect(() => {
					jobsQueue.register(123, validFunction, recallInterval);
				}).to.throw('Name argument must be a string'));

			it('should throw an error when trying to pass time that is not integer', async () =>
				expect(() => {
					jobsQueue.register('test_job', validFunction, 0.22);
				}).to.throw('Time argument must be integer'));

			it('should throw an error when trying to pass job as null', async () =>
				expect(() => {
					jobsQueue.register('test', null, recallInterval);
				}).to.throw('Job must be an instance of Function'));

			it('should throw an error when trying to pass job that is not an instance of Function', async () =>
				expect(() => {
					jobsQueue.register('test', 'test_job', recallInterval);
				}).to.throw('Job must be an instance of Function'));

			it('should throw an error when trying to pass job that is a function with more than 1 parameter', async () => {
				const myFuncWithTwoParams = (x = 1, cb) => cb(x);
				expect(() => {
					jobsQueue.register('test', myFuncWithTwoParams, recallInterval);
				}).to.throw('Job function should have callback argument');
			});

			it('should throw an error when trying to pass job that is an async function with 1 parameter', async () => {
				const myFuncWithTwoParams = async x => x;
				expect(() => {
					jobsQueue.register('test', myFuncWithTwoParams, recallInterval);
				}).to.throw('Job async function should not have arguments');
			});
		});

		describe('should register', () => {
			function dummyFunction(cb) {
				setTimeout(cb, execTimeInterval);
			}

			function testExecution(job, name, spy) {
				const expectingTimesToCall = 5;
				const interval = execTimeInterval + recallInterval;

				setTimeout(() => {
					expect(jobsQueue.jobs).to.be.an('object');
				}, expectingTimesToCall * interval);

				expect(jobsQueue.jobs).to.be.an('object');
				// Job returned from 'register' should be equal to one in 'jobsQueue'
				expect(job).to.equal(jobsQueue.jobs[name]);

				// First execution should happen immediatelly
				expect(spy.callCount).to.equal(1);

				// Every next execution should happen after execTimeInterval+recallInterval and not before
				clock.tick(interval - 10);
				expect(spy.callCount).to.equal(1);

				clock.tick(11);
				expect(spy.callCount).to.equal(2);

				// Job returned from 'register' should no longer be equal to one in 'jobsQueue'
				expect(job).to.not.equal(jobsQueue.jobs[name]);

				// Next execution should happen after recallInterval+execTimeInterval
				clock.tick(interval - 10);
				expect(spy.callCount).to.equal(2);

				clock.tick(11);
				expect(spy.callCount).to.equal(3);

				// Job returned from 'register' should no longer be equal to one in 'jobsQueue'
				expect(job).to.not.equal(jobsQueue.jobs[name]);

				// Next execution should happen after recallInterval+execTimeInterval
				clock.tick(interval - 10);
				expect(spy.callCount).to.equal(3);

				clock.tick(11);
				expect(spy.callCount).to.equal(4);

				// Job returned from 'register' should no longer be equal to one in 'jobsQueue'
				expect(job).to.not.equal(jobsQueue.jobs[name]);
			}

			let clock;

			before(done => {
				clock = sinonSandbox.useFakeTimers();
				done();
			});

			after(done => {
				jobsQueue.jobs = {};
				clock.restore();
				done();
			});

			it('should register first new job correctly and call properly (job exec: instant, job recall: 1s)', async () => {
				const name = 'job1';
				const spy = sinonSandbox.spy(dummyFunction);
				const job = jobsQueue.register(name, spy, recallInterval);
				expect(Object.keys(jobsQueue.jobs))
					.to.be.an('array')
					.and.lengthOf(1);
				return testExecution(job, name, spy);
			});

			it('should register second new job correctly and call properly (job exec: 10s, job recall: 1s)', async () => {
				execTimeInterval = 10000;

				const name = 'job2';
				const spy = sinonSandbox.spy(dummyFunction);
				const job = jobsQueue.register(name, spy, recallInterval);
				expect(Object.keys(jobsQueue.jobs))
					.to.be.an('array')
					.and.lengthOf(2);
				return testExecution(job, name, spy);
			});

			it('should register third new job correctly call properly (job exec: 2s, job recall: 10s)', async () => {
				recallInterval = 10000;
				execTimeInterval = 2000;

				const name = 'job3';
				const spy = sinonSandbox.spy(dummyFunction);
				const job = jobsQueue.register(name, spy, recallInterval);
				expect(Object.keys(jobsQueue.jobs))
					.to.be.an('array')
					.and.lengthOf(3);
				return testExecution(job, name, spy);
			});

			it('should throw an error immediately when trying to register same job twice', async () => {
				const name = 'job4';
				const spy = sinonSandbox.spy(dummyFunction);
				const job = jobsQueue.register(name, spy, recallInterval);
				expect(Object.keys(jobsQueue.jobs))
					.to.be.an('array')
					.and.lengthOf(4);
				testExecution(job, name, spy);

				return expect(() => {
					jobsQueue.register('job4', dummyFunction, recallInterval);
				}).to.throw('Synchronous job job4 already registered');
			});
		});
	});
});
