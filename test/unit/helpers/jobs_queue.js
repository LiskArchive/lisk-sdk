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

var rewire = require('rewire');
var jobsQueue = require('../../../helpers/jobs_queue.js');

var peers = rewire('../../../modules/peers');

// These tests are breaking other tests (relying on setTimeout) running on the same process because of a time stubbing
describe('helpers/jobsQueue', () => {
	// Test global variables
	var recallInterval = 1000;
	var execTimeInterval = 1;

	describe('register', () => {
		describe('should throw an erorr', () => {
			var validFunction;

			beforeEach(done => {
				validFunction = sinonSandbox.spy();
				done();
			});

			afterEach(done => {
				expect(validFunction.notCalled).to.be.true;
				done();
			});

			it('should throw an error when trying to pass job that is not a function', () => {
				return expect(() => {
					jobsQueue.register('test_job', 'test', recallInterval);
				}).to.throw('Syntax error - invalid parameters supplied');
			});

			it('should throw an error when trying to pass name that is not a string', () => {
				return expect(() => {
					jobsQueue.register(123, validFunction, recallInterval);
				}).to.throw('Syntax error - invalid parameters supplied');
			});

			it('should throw an error when trying to pass time that is not integer', () => {
				return expect(() => {
					jobsQueue.register('test_job', validFunction, 0.22);
				}).to.throw('Syntax error - invalid parameters supplied');
			});
		});

		describe('should register', () => {
			function dummyFunction(cb) {
				setTimeout(cb, execTimeInterval);
			}

			function testExecution(job, name, spy) {
				var expectingTimesToCall = 5;
				var interval = execTimeInterval + recallInterval;

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

			var clock;

			before(done => {
				clock = sinonSandbox.useFakeTimers();
				done();
			});

			after(done => {
				jobsQueue.jobs = {};
				clock.restore();
				done();
			});

			it('should register first new job correctly and call properly (job exec: instant, job recall: 1s)', () => {
				var name = 'job1';
				var spy = sinonSandbox.spy(dummyFunction);
				var job = jobsQueue.register(name, spy, recallInterval);
				expect(Object.keys(jobsQueue.jobs))
					.to.be.an('array')
					.and.lengthOf(1);
				return testExecution(job, name, spy);
			});

			it('should register second new job correctly and call properly (job exec: 10s, job recall: 1s)', () => {
				execTimeInterval = 10000;

				var name = 'job2';
				var spy = sinonSandbox.spy(dummyFunction);
				var job = jobsQueue.register(name, spy, recallInterval);
				expect(Object.keys(jobsQueue.jobs))
					.to.be.an('array')
					.and.lengthOf(2);
				return testExecution(job, name, spy);
			});

			it('should register third new job correctly call properly (job exec: 2s, job recall: 10s)', () => {
				recallInterval = 10000;
				execTimeInterval = 2000;

				var name = 'job3';
				var spy = sinonSandbox.spy(dummyFunction);
				var job = jobsQueue.register(name, spy, recallInterval);
				expect(Object.keys(jobsQueue.jobs))
					.to.be.an('array')
					.and.lengthOf(3);
				return testExecution(job, name, spy);
			});

			it('should throw an error immediately when trying to register same job twice', () => {
				var name = 'job4';
				var spy = sinonSandbox.spy(dummyFunction);
				var job = jobsQueue.register(name, spy, recallInterval);
				expect(Object.keys(jobsQueue.jobs))
					.to.be.an('array')
					.and.lengthOf(4);
				testExecution(job, name, spy);

				return expect(() => {
					jobsQueue.register('job4', dummyFunction, recallInterval);
				}).to.throw('Synchronous job job4 already registered');
			});

			it('should use same instance when required in different module (because of modules cache)', () => {
				var jobsQueuePeers = peers.__get__('jobsQueue');
				// Instances should be the same
				expect(jobsQueuePeers).to.equal(jobsQueue);

				// Register new job in peers module
				var name = 'job5';
				var spy = sinonSandbox.spy(dummyFunction);
				var job = jobsQueuePeers.register(name, spy, recallInterval);
				expect(Object.keys(jobsQueuePeers.jobs))
					.to.be.an('array')
					.and.lengthOf(5);
				testExecution(job, name, spy);
				// Instances still should be the same
				return expect(jobsQueuePeers).to.equal(jobsQueue);
			});
		});
	});
});
