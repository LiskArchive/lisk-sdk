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
 */

'use strict';

const jobsQueue = require('../../../../../../../src/application/node/utils/jobs_queue');

jest.useFakeTimers();

describe('utils/jobsQueue', () => {
	// Test global variables
	let recallInterval = 1000;
	let execTimeInterval = 1;

	describe('register', () => {
		describe('should throw an error', () => {
			let validFunction;

			beforeEach(() => {
				validFunction = jest.fn();
			});

			it('should throw an error when trying to pass name that is not a string', async () =>
				expect(() => {
					jobsQueue.register(123, validFunction, recallInterval);
				}).toThrow('Name argument must be a string'));

			it('should throw an error when trying to pass time that is not integer', async () =>
				expect(() => {
					jobsQueue.register('test_job', validFunction, 0.22);
				}).toThrow('Time argument must be integer'));

			it('should throw an error when trying to pass job as null', async () =>
				expect(() => {
					jobsQueue.register('test', null, recallInterval);
				}).toThrow('Job must be an instance of Function'));

			it('should throw an error when trying to pass job that is not an instance of Function', async () =>
				expect(() => {
					jobsQueue.register('test', 'test_job', recallInterval);
				}).toThrow('Job must be an instance of Function'));

			it('should throw an error when trying to pass job that is a function with more than 1 parameter', async () => {
				const myFuncWithTwoParams = (x = 1, cb) => cb(x);
				expect(() => {
					jobsQueue.register('test', myFuncWithTwoParams, recallInterval);
				}).toThrow('Job function should have callback argument');
			});

			it('should throw an error when trying to pass job that is an async function with 1 parameter', async () => {
				const myFuncWithTwoParams = async x => x;
				expect(() => {
					jobsQueue.register('test', myFuncWithTwoParams, recallInterval);
				}).toThrow('Job async function should not have arguments');
			});
		});

		describe('should register', () => {
			const myJob = cb => setTimeout(cb, execTimeInterval);

			function testExecution(job, name, spy) {
				const expectingTimesToCall = 5;
				const interval = execTimeInterval + recallInterval;

				setTimeout(() => {
					expect(jobsQueue.jobs).toBeInstanceOf('object');
				}, expectingTimesToCall * interval);

				// Check registered job
				expect(Object.keys(jobsQueue.jobs)).toEqual([name]);

				// Check jobs object
				expect(typeof jobsQueue.jobs).toEqual('object');

				// Job returned from 'register' should be equal to one in 'jobsQueue'
				expect(job).toEqual(jobsQueue.jobs[name]);

				// First execution should happen immediatelly
				expect(spy).toHaveBeenCalledTimes(1);

				// Every next execution should happen after execTimeInterval+recallInterval and not before
				jest.advanceTimersByTime(interval - 10);
				expect(spy).toHaveBeenCalledTimes(1);

				jest.advanceTimersByTime(11);
				expect(spy).toHaveBeenCalledTimes(2);

				// Job returned from 'register' should no longer be equal to one in 'jobsQueue'
				expect(job).not.toEqual(jobsQueue.jobs[name]);

				// Next execution should happen after recallInterval+execTimeInterval
				jest.advanceTimersByTime(interval - 10);
				expect(spy).toHaveBeenCalledTimes(2);

				jest.advanceTimersByTime(11);
				expect(spy).toHaveBeenCalledTimes(3);

				// Job returned from 'register' should no longer be equal to one in 'jobsQueue'
				expect(job).not.toEqual(jobsQueue.jobs[name]);

				// Next execution should happen after recallInterval+execTimeInterval
				jest.advanceTimersByTime(interval - 10);
				expect(spy).toHaveBeenCalledTimes(3);

				jest.advanceTimersByTime(11);
				expect(spy).toHaveBeenCalledTimes(4);

				// Job returned from 'register' should no longer be equal to one in 'jobsQueue'
				expect(job).not.toEqual(jobsQueue.jobs[name]);
			}

			beforeEach(() => {
				jobsQueue.jobs = {};
				jest.clearAllTimers();
			});

			it('should register first new job correctly and call properly (job exec: instant, job recall: 1s)', async () => {
				const name = 'job1';
				const spy = jest.fn(myJob);
				const job = jobsQueue.register(name, spy, recallInterval);

				return testExecution(job, name, spy);
			});

			it('should register second new job correctly and call properly (job exec: 10s, job recall: 1s)', async () => {
				execTimeInterval = 10000;

				const name = 'job2';
				const spy = jest.fn(myJob);
				const job = jobsQueue.register(name, spy, recallInterval);

				return testExecution(job, name, spy);
			});

			it('should register third new job correctly call properly (job exec: 2s, job recall: 10s)', async () => {
				recallInterval = 10000;
				execTimeInterval = 2000;

				const name = 'job3';
				const spy = jest.fn(myJob);
				const job = jobsQueue.register(name, spy, recallInterval);

				return testExecution(job, name, spy);
			});

			it('should throw an error immediately when trying to register same job twice', async () => {
				const name = 'job4';
				const spy = jest.fn(myJob);
				const job = jobsQueue.register(name, spy, recallInterval);

				testExecution(job, name, spy);

				return expect(() => {
					jobsQueue.register('job4', myJob, recallInterval);
				}).toThrow('Synchronous job job4 already registered');
			});
		});
	});
});
