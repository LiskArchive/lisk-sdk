'use strict';

var expect = require('chai').expect;
var Rx = require('rx');
var application = require('./../common/application');

describe('synchronousTasks', function () {

	var library;

	before('init sandboxed application', function (done) {
		application.init({sandbox: {name: 'lisk_test_synchronous_tasks'}}, function (scope) {
			library = scope;
			done();
		});
	});

	after('cleanup sandboxed application', function (done) {
		application.cleanup(done);
	});

	describe('when events are emitted after any of synchronous task starts', function () {

		var intervalMs;
		var durationMs;
		var attemptToForgeRunningSubject;
		var synchronizeBlockchainRunningSubject;

		var synchronousTaskMock = function (isTaskRunningSubject, nextCb) {
			isTaskRunningSubject.onNext(true);
			setTimeout(function () {
				isTaskRunningSubject.onNext(false);
				nextCb();
			}, durationMs);
		};

		before(function () {
			attemptToForgeRunningSubject = new Rx.BehaviorSubject();
			synchronizeBlockchainRunningSubject = new Rx.BehaviorSubject();
		});

		after(function () {
			attemptToForgeRunningSubject.dispose();
			synchronizeBlockchainRunningSubject.dispose();
		});

		describe('when "attempt to forge" synchronous task runs every 100 ms and takes 101 ms', function () {

			intervalMs = 100;
			durationMs = intervalMs + 1;

			before(function () {
				library.modules.delegates.onBlockchainReady = library.rewiredModules.delegates.prototype.onBlockchainReady;
				library.rewiredModules.delegates.__set__('__private.forgeInterval', intervalMs);
				library.rewiredModules.delegates.__set__('__private.nextForge', synchronousTaskMock.bind(null, attemptToForgeRunningSubject));
				library.modules.delegates.onBlockchainReady();
			});

			describe('when "blockchain synchronization" synchronous task runs every 100 ms and takes 101 ms', function () {

				before(function () {
					library.rewiredModules.loader.__set__('__private.syncInterval', intervalMs);
					library.rewiredModules.loader.__set__('__private.sync', synchronousTaskMock.bind(null, synchronizeBlockchainRunningSubject));
					var jobsQueue = require('../../helpers/jobsQueue');
					var originalLoaderSyncTimerJob = jobsQueue.jobs['loaderSyncTimer'];
					clearTimeout(originalLoaderSyncTimerJob);  // Terminate original job
					jobsQueue.jobs['loaderSyncTimer'] = null;  // Remove original job
					library.modules.loader.onPeersReady();     // Execute the mocked blockchain synchronization process
				});

				describe('within 5000 ms', function () {

					beforeEach(function () {
						setTimeout(function () {
							attemptToForgeRunningSubject.onCompleted();
							synchronizeBlockchainRunningSubject.onCompleted();
							attemptToForgeRunningSubject = new Rx.BehaviorSubject();
							synchronizeBlockchainRunningSubject = new Rx.BehaviorSubject();
						}, 5000);
					});

					it('"attempt to forge" task should never start when "blockchain synchronization" task is running', function (done) {
						attemptToForgeRunningSubject
							.filter(function (isStarting) {return isStarting;})
							.subscribe(function () {expect(synchronizeBlockchainRunningSubject.getValue()).to.be.false;}, done, done);
					});

					it('"blockchain synchronization" task should never start when "attempt to forge" task is running', function (done) {
						synchronizeBlockchainRunningSubject
							.filter(function (isStarting) {return isStarting;})
							.subscribe(function () {expect(attemptToForgeRunningSubject.getValue()).to.be.false;}, done, done);
					});
				});
			});
		});
	});
});
