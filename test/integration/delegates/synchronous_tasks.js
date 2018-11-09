'use strict';

const expect = require('chai').expect;
const Rx = require('rx');
const localCommon = require('../common.js');
const jobsQueue = require('../../../helpers/jobs_queue.js');

describe('system test (delegates) - synchronous tasks', () => {
	let library;

	localCommon.beforeBlock('system_delegates_synchronous_tasks', lib => {
		library = lib;
	});

	describe('when events are emitted after any of synchronous task starts', () => {
		var intervalMs;
		var durationMs;
		var attemptToForgeRunningSubject;
		var synchronizeBlockchainRunningSubject;

		var synchronousTaskMock = function(isTaskRunningSubject, nextCb) {
			isTaskRunningSubject.onNext(true);
			setTimeout(() => {
				isTaskRunningSubject.onNext(false);
				nextCb();
			}, durationMs);
		};

		before(done => {
			attemptToForgeRunningSubject = new Rx.BehaviorSubject();
			synchronizeBlockchainRunningSubject = new Rx.BehaviorSubject();
			done();
		});

		after(done => {
			attemptToForgeRunningSubject.dispose();
			synchronizeBlockchainRunningSubject.dispose();
			done();
		});

		describe('when "attempt to forge" synchronous task runs every 100 ms and takes 101 ms', () => {
			intervalMs = 100;
			durationMs = intervalMs + 1;

			before(done => {
				library.modules.delegates.onBlockchainReady =
					library.rewiredModules.delegates.prototype.onBlockchainReady;
				library.rewiredModules.delegates.__set__(
					'__private.forgeInterval',
					intervalMs
				);
				library.rewiredModules.delegates.__set__(
					'__private.nextForge',
					synchronousTaskMock.bind(null, attemptToForgeRunningSubject)
				);
				library.modules.delegates.onBlockchainReady();
				done();
			});

			describe('when "blockchain synchronization" synchronous task runs every 100 ms and takes 101 ms', () => {
				before(done => {
					library.rewiredModules.loader.__set__(
						'__private.syncInterval',
						intervalMs
					);
					library.rewiredModules.loader.__set__(
						'__private.sync',
						synchronousTaskMock.bind(null, synchronizeBlockchainRunningSubject)
					);
					var originalLoaderSyncTimerJob = jobsQueue.jobs.loaderSyncTimer;
					clearTimeout(originalLoaderSyncTimerJob); // Terminate original job
					delete jobsQueue.jobs.loaderSyncTimer; // Remove original job
					library.modules.loader.onPeersReady(); // Execute the mocked blockchain synchronization process
					done();
				});

				describe('within 5000 ms', () => {
					beforeEach(done => {
						setTimeout(() => {
							attemptToForgeRunningSubject.onCompleted();
							synchronizeBlockchainRunningSubject.onCompleted();
							attemptToForgeRunningSubject = new Rx.BehaviorSubject();
							synchronizeBlockchainRunningSubject = new Rx.BehaviorSubject();
						}, 5000);
						done();
					});

					it('"attempt to forge" task should never start when "blockchain synchronization" task is running', done => {
						attemptToForgeRunningSubject
							.filter(isStarting => {
								return isStarting;
							})
							.subscribe(
								() => {
									expect(synchronizeBlockchainRunningSubject.getValue()).to.be
										.false;
								},
								done,
								done
							);
					});

					it('"blockchain synchronization" task should never start when "attempt to forge" task is running', done => {
						synchronizeBlockchainRunningSubject
							.filter(isStarting => {
								return isStarting;
							})
							.subscribe(
								() => {
									expect(attemptToForgeRunningSubject.getValue()).to.be.false;
								},
								done,
								done
							);
					});
				});
			});
		});
	});
});
