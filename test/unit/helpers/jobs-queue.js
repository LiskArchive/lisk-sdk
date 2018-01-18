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

// Init tests dependencies
var rewire = require('rewire');

// Init tests subject
var jobsQueue = require('../../../helpers/jobsQueue.js');
var peers = rewire('../../../modules/peers');

// These tests are breaking other tests (relying on setTimeout) running on the same process because of a time stubbing
describe('helpers/jobsQueue', function () {
	// Test global variables
	var recallInterval = 1000;
	var execTimeInterval = 1;

	describe('register', function () {

		describe('should throw an erorr', function () {

			var validFunction;

			beforeEach(function () {
				validFunction = sinonSandbox.spy();
			});

			afterEach(function () {
				validFunction.notCalled.should.be.true;
			});

			it('should throw an error when trying to pass job that is not a function', function () {
				(function () {
					jobsQueue.register('test_job', 'test', recallInterval);
				}).should.throw('Syntax error - invalid parameters supplied');
			});

			it('should throw an error when trying to pass name that is not a string', function () {
				(function () {
					jobsQueue.register(123, validFunction, recallInterval);
				}).should.throw('Syntax error - invalid parameters supplied');
			});

			it('should throw an error when trying to pass time that is not integer', function () {
				(function () {
					jobsQueue.register('test_job', validFunction, 0.22);
				}).should.throw('Syntax error - invalid parameters supplied');
			});
		});

		describe('should register', function () {

			function dummyFunction (cb) {
				setTimeout(cb, execTimeInterval);
			}

			function testExecution (job, name, spy) {

				var expectingTimesToCall = 5;
				var interval = execTimeInterval + recallInterval;

				setTimeout(function () {
					jobsQueue.jobs.should.be.an('object');

				}, expectingTimesToCall * interval);

				jobsQueue.jobs.should.be.an('object');
				// Job returned from 'register' should be equal to one in 'jobsQueue'
				should.equal(job, jobsQueue.jobs[name]);

				// First execution should happen immediatelly
				spy.callCount.should.equal(1);

				// Every next execution should happen after execTimeInterval+recallInterval and not before
				clock.tick(interval-10);
				spy.callCount.should.equal(1);

				clock.tick(11);
				spy.callCount.should.equal(2);

				// Job returned from 'register' should no longer be equal to one in 'jobsQueue'
				should.not.equal(job, jobsQueue.jobs[name]);

				// Next execution should happen after recallInterval+execTimeInterval
				clock.tick(interval-10);
				spy.callCount.should.equal(2);

				clock.tick(11);
				spy.callCount.should.equal(3);

				// Job returned from 'register' should no longer be equal to one in 'jobsQueue'
				should.not.equal(job, jobsQueue.jobs[name]);

				// Next execution should happen after recallInterval+execTimeInterval
				clock.tick(interval-10);
				spy.callCount.should.equal(3);

				clock.tick(11);
				spy.callCount.should.equal(4);

				// Job returned from 'register' should no longer be equal to one in 'jobsQueue'
				should.not.equal(job, jobsQueue.jobs[name]);
			}

			var clock;

			before(function () {
				clock = sinonSandbox.useFakeTimers();
			});

			after(function () {
				jobsQueue.jobs = {};
				clock.restore();
			});

			it('should register first new job correctly and call properly (job exec: instant, job recall: 1s)', function () {
				var name = 'job1';
				var spy = sinonSandbox.spy(dummyFunction);
				var job = jobsQueue.register(name, spy, recallInterval);
				Object.keys(jobsQueue.jobs).should.be.an('array').and.lengthOf(1);
				testExecution(job, name, spy);
			});

			it('should register second new job correctly and call properly (job exec: 10s, job recall: 1s)', function () {
				execTimeInterval = 10000;

				var name = 'job2';
				var spy = sinonSandbox.spy(dummyFunction);
				var job = jobsQueue.register(name, spy, recallInterval);
				Object.keys(jobsQueue.jobs).should.be.an('array').and.lengthOf(2);
				testExecution(job, name, spy);
			});

			it('should register third new job correctly call properly (job exec: 2s, job recall: 10s)', function () {
				recallInterval = 10000;
				execTimeInterval = 2000;

				var name = 'job3';
				var spy = sinonSandbox.spy(dummyFunction);
				var job = jobsQueue.register(name, spy, recallInterval);
				Object.keys(jobsQueue.jobs).should.be.an('array').and.lengthOf(3);
				testExecution(job, name, spy);
			});

			it('should throw an error immediately when trying to register same job twice', function () {
				var name = 'job4';
				var spy = sinonSandbox.spy(dummyFunction);
				var job = jobsQueue.register(name, spy, recallInterval);
				Object.keys(jobsQueue.jobs).should.be.an('array').and.lengthOf(4);
				testExecution(job, name, spy);

				(function () {
					jobsQueue.register('job4', dummyFunction, recallInterval);
				}).should.throw('Synchronous job job4 already registered');
			});

			it('should use same instance when required in different module (because of modules cache)', function () {
				var jobsQueuePeers = peers.__get__('jobsQueue');
				// Instances should be the same
				jobsQueuePeers.should.equal(jobsQueue);

				// Register new job in peers module
				var name = 'job5';
				var spy = sinonSandbox.spy(dummyFunction);
				var job = jobsQueuePeers.register(name, spy, recallInterval);
				Object.keys(jobsQueuePeers.jobs).should.be.an('array').and.lengthOf(5);
				testExecution(job, name, spy);
				// Instances still should be the same
				jobsQueuePeers.should.equal(jobsQueue);
			});
		});
	});
});
