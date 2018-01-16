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

var git = require('../../../helpers/git');
var childProcess = require('child_process');

describe('git', function () {

	describe('getLastCommit', function () {

		describe('when "git rev-parse HEAD" command fails', function () {

			var validErrorMessage = 'Not a git repository';
			var spawnSyncStub;

			beforeEach(function () {
				spawnSyncStub = sinonSandbox.stub(childProcess, 'spawnSync').returns({stderr: validErrorMessage});
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
				spawnSyncStub = sinonSandbox.stub(childProcess, 'spawnSync').returns({stderr: '', stdout: validCommitHash});
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
