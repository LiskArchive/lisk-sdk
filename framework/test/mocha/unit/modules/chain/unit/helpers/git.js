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

const childProcess = require('child_process');
const fs = require('fs');
const git = require('../../../../../../../src/modules/chain/helpers/git');

describe('git', () => {
	afterEach(done => {
		sinonSandbox.restore();
		done();
	});

	describe('getLastCommit', () => {
		describe('when "git rev-parse HEAD" command succeeds', () => {
			const validCommitHash = '99e5458d721f73623a6fc866f15cfe2e2b18edcd';

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
			const validCommitHash = '99e5458d721f73623a6fc866f15cfe2e2b18edcd';

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
			const validErrorMessage =
				'Not a git repository and no revision file found.';

			beforeEach(done => {
				sinonSandbox
					.stub(childProcess, 'spawnSync')
					.returns({ stderr: validErrorMessage });
				sinonSandbox.stub(fs, 'readFileSync').throws(Error);
				done();
			});

			it('should throw an error', done => {
				expect(git.getLastCommit).throw(Error, validErrorMessage);
				done();
			});
		});

		describe('when git is not installed', () => {
			const gitNotInstalledErr = 'Error: spawnSync git ENOEN';
			const validCommitHash = '99e5458d721f73623a6fc866f15cfe2e2b18edcd';

			beforeEach(done => {
				sinonSandbox.stub(childProcess, 'spawnSync').throws(gitNotInstalledErr);
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

		describe('when another error different than git is not installed', () => {
			const validCommitHash = '99e5458d721f73623a6fc866f15cfe2e2b18edcd';

			beforeEach(done => {
				sinonSandbox.stub(childProcess, 'spawnSync').throws(Error);
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
	});
});
