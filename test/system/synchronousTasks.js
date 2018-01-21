'use strict';

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

	describe('when "attempt to forge" synchronous tasks runs every 100 ms and takes 200 ms', function () {

		describe('when "blockchain synchronization" synchronous tasks runs every 100 ms and takes 200 ms', function () {

			it('"attempt to forge" task should never start when "blockchain synchronization" task is running');

			it('"blockchain synchronization" task should never start when "attempt to forge" task is running');
		});
	});
});
