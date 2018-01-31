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

describe('git', () => {
	describe('getLastCommit', () => {
		describe('when "git rev-parse HEAD" command fails', () => {
			var validErrorMessage = 'Not a git repository';
			var spawnSyncStub;

			beforeEach(() => {
				spawnSyncStub = sinonSandbox
					.stub(childProcess, 'spawnSync')
					.returns({ stderr: validErrorMessage });
			});

			afterEach(() => {
				spawnSyncStub.restore();
			});

			it('should throw an error', () => {
				expect(git.getLastCommit).throws(Error, validErrorMessage);
			});
		});

		describe('when "git rev-parse HEAD" command succeeds', () => {
			var validCommitHash = '99e5458d721f73623a6fc866f15cfe2e2b18edcd';
			var spawnSyncStub;

			beforeEach(() => {
				spawnSyncStub = sinonSandbox
					.stub(childProcess, 'spawnSync')
					.returns({ stderr: '', stdout: validCommitHash });
			});

			afterEach(() => {
				spawnSyncStub.restore();
			});

			it('should return a commit hash', () => {
				expect(git.getLastCommit()).equal(validCommitHash);
			});
		});
	});
});
