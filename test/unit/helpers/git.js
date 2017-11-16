'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var git = require('../../../helpers/git');
var childProcess = require('child_process');

describe('git', function () {
	
	describe('getLastCommit', function () {
		
		describe('when "git rev-parse HEAD" command fails', function () {

			var validErrorMessage = 'Not a git repository';
			var spawnSyncStub;

			beforeEach(function () {
				spawnSyncStub = sinon.stub(childProcess, 'spawnSync').returns({stderr: validErrorMessage});
			});

			afterEach(function () {
				spawnSyncStub.restore();
			});

			it('should throw an error', function () {
				expect(git.getLastCommit).throws(Error, validErrorMessage);
			});
		});

		describe('when "git rev-parse HEAD" command succeeds', function () {

			var validCommitHash = '99e5458d721f73623a6fc866f15cfe2e2b18edcd';
			var spawnSyncStub;

			beforeEach(function () {
				spawnSyncStub = sinon.stub(childProcess, 'spawnSync').returns({stderr: '', stdout: validCommitHash});
			});

			afterEach(function () {
				spawnSyncStub.restore();
			});

			it('should return a commit hash', function () {
				expect(git.getLastCommit()).equal(validCommitHash);
			});
		});
	});
});
