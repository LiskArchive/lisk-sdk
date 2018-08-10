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

const async = require('async');
const sinon = require('sinon');
const Promise = require('bluebird');
const RoundsRepository = require('../../../db/repos/rounds.js');
const localCommon = require('./../common');

const constants = global.constants;

describe('tick', () => {
	let library;

	// Set rewards start at 150-th block
	constants.rewards.offset = 150;

	localCommon.beforeBlock('lisk_functional_rounds', lib => {
		library = lib;
	});

	describe('when forging second last block of the round', () => {
		beforeEach('forge 99 blocks', done => {
			async.eachSeries(
				_.range(0, 98),
				(index, eachSeriesCb) =>
					localCommon.addTransactionsAndForge(library, [], eachSeriesCb),
				done
			);
		});

		describe('when connection is not lost', () => {
			afterEach('delete blocks', () => {
				return Promise.all([
					library.db.none('DELETE FROM blocks WHERE "height" > 1;'),
					library.db.none('DELETE FROM forks_stat;'),
				]).then(() => {
					library.modules.blocks.lastBlock.set(
						__testContext.config.genesisBlock
					);
				});
			});

			describe('when rounds.clearRoundSnapshot() fails', () => {
				// For stubbing the rounds.clearRoundSnapshot query, I need to override this method.
				let clearRoundSnapshotStub;

				beforeEach(done => {
					clearRoundSnapshotStub = sinon
						.stub(RoundsRepository.prototype, 'clearRoundSnapshot')
						.rejects(new Error('ERR'));
					done();
				});

				afterEach(done => {
					clearRoundSnapshotStub.restore();
					done();
				});

				it('should fail forging block with err = "ERR"', done => {
					localCommon.addTransactionsAndForge(library, [], err => {
						expect(err.message).to.equal('ERR');
						done();
					});
				});
			});

			describe('when rounds.clearVotesSnapshot() fails', () => {
				// For stubbing the rounds.clearVotesSnapshot query, I need to override this method.
				let clearVotesSnapshotStub;

				beforeEach(done => {
					clearVotesSnapshotStub = sinon
						.stub(RoundsRepository.prototype, 'clearVotesSnapshot')
						.rejects(new Error('ERR'));
					done();
				});

				afterEach(done => {
					clearVotesSnapshotStub.restore();
					done();
				});

				it('should fail forging block with err = "ERR"', done => {
					localCommon.addTransactionsAndForge(library, [], err => {
						expect(err.message).to.equal('ERR');
						done();
					});
				});
			});

			describe('when rounds.performRoundSnapshot() fails', () => {
				// For stubbing the rounds.clearRoundSnapshot query, I need to override this method.
				let performRoundSnapshotStub;

				beforeEach(done => {
					performRoundSnapshotStub = sinon
						.stub(RoundsRepository.prototype, 'performRoundSnapshot')
						.rejects(new Error('ERR'));
					done();
				});

				afterEach(done => {
					performRoundSnapshotStub.restore();
					done();
				});

				it('should fail forging block with err = "ERR"', done => {
					localCommon.addTransactionsAndForge(library, [], err => {
						expect(err.message).to.equal('ERR');
						done();
					});
				});
			});

			describe('when rounds.performVotesSnapshot() fails', () => {
				// For stubbing the rounds.performVotesSnapshot query, I need to override this method.
				let performVotesSnapshotStub;

				beforeEach(done => {
					performVotesSnapshotStub = sinon
						.stub(RoundsRepository.prototype, 'performVotesSnapshot')
						.rejects(new Error('ERR'));
					done();
				});

				afterEach(done => {
					performVotesSnapshotStub.restore();
					done();
				});

				it('should fail forging block with err = "ERR"', done => {
					localCommon.addTransactionsAndForge(library, [], err => {
						expect(err.message).to.equal('ERR');
						done();
					});
				});
			});

			describe('when all promises succeed', () => {
				it('should be able to forge block ', done => {
					localCommon.addTransactionsAndForge(library, [], err => {
						expect(err).to.not.exist;
						done();
					});
				});
			});
		});

		describe('when there is a loss of connection', () => {
			// For stubbing the rounds.performVotesSnapshot query, I need to override this method.
			let performVotesSnapshotTemp;

			beforeEach(done => {
				performVotesSnapshotTemp =
					RoundsRepository.prototype.performVotesSnapshot;
				RoundsRepository.prototype.performVotesSnapshot = () => {
					return library.db.query(
						"SELECT pg_terminate_backend(pid) FROM pg_stat_activity where datname = 'lisk_test_lisk_functional_rounds'"
					);
				};
				done();
			});

			afterEach(done => {
				RoundsRepository.prototype.performVotesSnapshot = performVotesSnapshotTemp;
				done();
			});

			it('should fail forging block with err', done => {
				localCommon.addTransactionsAndForge(library, [], err => {
					// One of these two errors based on the query
					expect([
						'Querying against a released or lost connection.',
						'terminating connection due to administrator command',
					]).to.include(err.message);
					done();
				});
			});
		});
	});
});
