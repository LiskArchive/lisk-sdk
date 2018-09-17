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

var childProcess = require('child_process');
var fs = require('fs');
var git = require('../../../helpers/git');

describe('git', () => {
	afterEach(done => {
		sinonSandbox.restore();
		done();
	});

	describe('getLastCommit', () => {
		describe('when "git rev-parse HEAD" command succeeds', () => {
			var validCommitHash = '99e5458d721f73623a6fc866f15cfe2e2b18edcd';

			beforeEach(done => {
				sinonSandbox
					.stub(childProcess, 'spawnSync')
					.returns({ stderr: '', stdout: validCommitHash });
				done();
			});

			it('should return a commit hash', done => {
				expect(git.getLastCommit()).equal(validCommitHash);
				done();
			});
		});

		describe('when "git rev-parse HEAD" command failed and a revision file found', () => {
			var validCommitHash = '99e5458d721f73623a6fc866f15cfe2e2b18edcd';

			beforeEach(done => {
				sinonSandbox
					.stub(childProcess, 'spawnSync')
					.returns({ stderr: 'Not a git repository' });

				sinonSandbox.stub(fs, 'readFileSync').returns(validCommitHash);
				done();
			});

			it('should return a commit hash', done => {
				expect(git.getLastCommit()).equal(validCommitHash);
				expect(childProcess.spawnSync).to.be.calledOnce;
				expect(fs.readFileSync).to.be.calledOnce;
				expect(fs.readFileSync).to.be.calledWith('REVISION');
				done();
			});
		});

		describe('when "git rev-parse HEAD" command failed and no revision file found', () => {
			var validErrorMessage =
				'Not a git repository and no revision file found.';

			beforeEach(done => {
				sinonSandbox
					.stub(childProcess, 'spawnSync')
					.returns({ stderr: validErrorMessage });
				done();
			});

			it('should throw an error', done => {
				expect(git.getLastCommit).throws(Error, validErrorMessage);
				done();
			});
		});
	});
});
