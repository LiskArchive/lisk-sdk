'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');
var git = require('../../../helpers/git');
var childProcess = require('child_process');

describe('git', function () {
	describe('getLastCommit', function () {

		it('should call childProcess.spawnSync');

		describe('when childProcess.spawnSync has an error', function () {
			var errorMessage = 'an error';
			beforeEach(function () {
				sinon.stub(childProcess, 'spawnSync').callsFake(function (name, anArray) {
					return {
						stderr: errorMessage
					};
				});
			});

			afterEach(function () {
				childProcess.spawnSync.restore();
			});

			it('should validate the error', function () {
				expect(function () { git.getLastCommit();}).to.throw(Error, errorMessage);
			});
		});

		describe('when childProcess.spawnSync does not have an error', function () {
			var standardOut = 'standard out';
			beforeEach(function () {
				sinon.stub(childProcess, 'spawnSync').callsFake(function (name, anArray) {
					return {
						stderr: '',
						stdout: standardOut
					};
				});
			});

			afterEach(function () {
				childProcess.spawnSync.restore();
			});

			it('should validate the message to standard out', function () {
				expect(git.getLastCommit()).to.equal(standardOut);
			});
		});
	});
});
