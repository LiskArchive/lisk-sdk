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

		var attemptToForgeRunningSubject = new Rx.BehaviorSubject();
		var synchronizeBlockchainRunningSubject = new Rx.BehaviorSubject();

		describe('when "attempt to forge" synchronous tasks runs every 100 ms and takes 101 ms', function () {

			var intervalMs = 100;
			var durationMs = intervalMs + 1;

			before(function () {
				library.modules.delegates.onBlockchainReady = library.rewiredModules.delegates.prototype.onBlockchainReady;
				library.rewiredModules.delegates.__set__('__private.forgeAttemptInterval', intervalMs);
				library.rewiredModules.delegates.__set__('__private.nextForge', function (nextForgeCb) {
					attemptToForgeRunningSubject.onNext(true);
					setTimeout(function () {
						attemptToForgeRunningSubject.onNext(false);
						nextForgeCb();
					}, durationMs);
				});
				library.modules.delegates.onBlockchainReady();
			});

			describe('when "blockchain synchronization" synchronous tasks runs every 100 ms and takes 101 ms', function () {

				before(function () {
					library.rewiredModules.loader.__set__('__private.syncInterval', intervalMs);
					library.rewiredModules.loader.__set__('__private.sync', function (nextForgeCb) {
						synchronizeBlockchainRunningSubject.onNext(true);
						setTimeout(function () {
							synchronizeBlockchainRunningSubject.onNext(false);
							nextForgeCb();
						}, durationMs);
					});
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

					after(function () {
						attemptToForgeRunningSubject.dispose();
						synchronizeBlockchainRunningSubject.dispose();
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
