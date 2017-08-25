'use strict';

// Init tests dependencies
var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');
var rewire = require('rewire');

// Init tests subject
var jobsQueue = require('../../../helpers/jobsQueue.js');
var peers = rewire('../../../modules/peers');

describe('helpers/jobsQueue', function () {
	// Test global variables
	var recallInterval = 1000;
	var execTimeInterval = 1;

	describe('register', function () {

		describe('should throw an erorr', function () {

			var validFunction;

			beforeEach(function () {
				validFunction = sinon.spy();
			});

			afterEach(function () {
				expect(validFunction.notCalled).to.be.true;
			});

			it('should throw an error when trying to pass job that is not a function', function () {
				expect(function () {
					jobsQueue.register('test_job', 'test', recallInterval);
				}).to.throw('Syntax error - invalid parameters supplied');
			});

			it('should throw an error when trying to pass name that is not a string', function () {
				expect(function () {
					jobsQueue.register(123, validFunction, recallInterval);
				}).to.throw('Syntax error - invalid parameters supplied');
			});

			it('should throw an error when trying to pass time that is not integer', function () {
				expect(function () {
					jobsQueue.register('test_job', validFunction, 0.22);
				}).to.throw('Syntax error - invalid parameters supplied');
			});
		});

		//ToDo: These tests should not stub a time as it breaks others (relying on setTimeout) tests execution
		describe.skip('should register', function () {

			function dummyFunction (cb) {
				setTimeout(cb, execTimeInterval);
			}

			function testExecution (job, name, spy) {

				var expectingTimesToCall = 5;
				var interval = execTimeInterval + recallInterval;

				setTimeout(function () {
					expect(jobsQueue.jobs).to.be.an('object');

				}, expectingTimesToCall * interval);

				expect(jobsQueue.jobs).to.be.an('object');
				// Job returned from 'register' should be equal to one in 'jobsQueue'
				expect(job).to.equal(jobsQueue.jobs[name]);

				// First execution should happen immediatelly
				expect(spy.callCount).to.equal(1);

				// Every next execution should happen after execTimeInterval+recallInterval and not before

				clock.tick(interval-10);
				expect(spy.callCount).to.equal(1);

				clock.tick(11);
				expect(spy.callCount).to.equal(2);

				// Job returned from 'register' should no longer be equal to one in 'jobsQueue'
				expect(job).to.not.equal(jobsQueue.jobs[name]);

				// Next execution should happen after recallInterval+execTimeInterval
				clock.tick(interval-10);
				expect(spy.callCount).to.equal(2);

				clock.tick(11);
				expect(spy.callCount).to.equal(3);

				// Job returned from 'register' should no longer be equal to one in 'jobsQueue'
				expect(job).to.not.equal(jobsQueue.jobs[name]);

				// Next execution should happen after recallInterval+execTimeInterval
				clock.tick(interval-10);
				expect(spy.callCount).to.equal(3);

				clock.tick(11);
				expect(spy.callCount).to.equal(4);

				// Job returned from 'register' should no longer be equal to one in 'jobsQueue'
				expect(job).to.not.equal(jobsQueue.jobs[name]);
			}

			var clock;

			before(function () {
				clock = sinon.useFakeTimers();
			});

			after(function () {
				jobsQueue.jobs = {};
				clock.restore();
			});

			it('should register first new job correctly and call properly (job exec: instant, job recall: 1s)', function () {
				var name = 'job1';
				var spy = sinon.spy(dummyFunction);
				var job = jobsQueue.register(name, spy, recallInterval);
				expect(Object.keys(jobsQueue.jobs)).to.be.an('array').and.lengthOf(1);
				testExecution(job, name, spy);
			});

			it('should register second new job correctly and call properly (job exec: 10s, job recall: 1s)', function () {
				execTimeInterval = 10000;

				var name = 'job2';
				var spy = sinon.spy(dummyFunction);
				var job = jobsQueue.register(name, spy, recallInterval);
				expect(Object.keys(jobsQueue.jobs)).to.be.an('array').and.lengthOf(2);
				testExecution(job, name, spy);
			});

			it('should register third new job correctly call properly (job exec: 2s, job recall: 10s)', function () {
				recallInterval = 10000;
				execTimeInterval = 2000;

				var name = 'job3';
				var spy = sinon.spy(dummyFunction);
				var job = jobsQueue.register(name, spy, recallInterval);
				expect(Object.keys(jobsQueue.jobs)).to.be.an('array').and.lengthOf(3);
				testExecution(job, name, spy);
			});

			it('should throw an error immediately when trying to register same job twice', function () {
				var name = 'job4';
				var spy = sinon.spy(dummyFunction);
				var job = jobsQueue.register(name, spy, recallInterval);
				expect(Object.keys(jobsQueue.jobs)).to.be.an('array').and.lengthOf(4);
				testExecution(job, name, spy);

				expect(function () {
					jobsQueue.register('job4', dummyFunction, recallInterval);
				}).to.throw('Synchronous job job4 already registered');
			});

			it('should use same instance when required in different module (because of modules cache)', function () {
				var jobsQueuePeers = peers.__get__('jobsQueue');
				// Instances should be the same
				expect(jobsQueuePeers).to.equal(jobsQueue);

				// Register new job in peers module
				var name = 'job5';
				var spy = sinon.spy(dummyFunction);
				var job = jobsQueuePeers.register(name, spy, recallInterval);
				expect(Object.keys(jobsQueuePeers.jobs)).to.be.an('array').and.lengthOf(5);
				testExecution(job, name, spy);
				// Instances still should be the same
				expect(jobsQueuePeers).to.equal(jobsQueue);
			});
		});
	});
});
