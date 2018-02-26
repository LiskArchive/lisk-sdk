/* eslint-disable mocha/no-pending-tests */
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

var rewire = require('rewire');

var BlocksVerify = rewire('../../../../modules/blocks/verify.js');

describe('blocks/verify', () => {
	let library;
	let __private;
	let loggerStub;
	let dbStub;
	let logicBlockStub;
	let logicTransactionStub;
	let blocksVerifyModule;
	let modulesStub;
	let modules;

	beforeEach(done => {
		// Logic
		loggerStub = {
			trace: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
		};
		dbStub = sinonSandbox.stub();
		logicBlockStub = sinonSandbox.stub();
		logicTransactionStub = {
			getId: sinonSandbox.stub(),
			checkConfirmed: sinonSandbox.stub(),
			verify: sinonSandbox.stub(),
		};

		blocksVerifyModule = new BlocksVerify(
			loggerStub,
			logicBlockStub,
			logicTransactionStub,
			dbStub
		);

		library = BlocksVerify.__get__('library');
		__private = BlocksVerify.__get__('__private');

		// Modules
		const modulesAccountsStub = {
			getAccount: sinonSandbox.stub(),
		};
		const modulesDelegatesStub = {
			fork: sinonSandbox.stub(),
		};
		const modulesTransactionsStub = {
			undoUnconfirmed: sinonSandbox.stub(),
			removeUnconfirmedTransaction: sinonSandbox.stub(),
		};
		modulesStub = {
			accounts: modulesAccountsStub,
			delegates: modulesDelegatesStub,
			transactions: modulesTransactionsStub,
		};

		blocksVerifyModule.onBind(modulesStub);
		modules = BlocksVerify.__get__('modules');
		done();
	});

	afterEach(() => {
		return sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should assign params to library', () => {
			expect(library.logger).to.eql(loggerStub);
			expect(library.db).to.eql(dbStub);
			expect(library.logic.block).to.eql(logicBlockStub);
			return expect(library.logic.transaction).to.eql(logicTransactionStub);
		});

		it('should initialize __private.blockReward', () => {
			expect(__private.blockReward).to.be.an('object');
			return expect(__private.blockReward.calcReward).to.be.a('function');
		});

		it('should call library.logger.trace with "Blocks->Verify: Submodule initialized."', () => {
			return expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Verify: Submodule initialized.'
			);
		});

		it('should return self', () => {
			expect(blocksVerifyModule).to.be.an('object');
			expect(blocksVerifyModule.verifyReceipt).to.be.a('function');
			expect(blocksVerifyModule.onBlockchainReady).to.be.a('function');
			expect(blocksVerifyModule.onNewBlock).to.be.a('function');
			expect(blocksVerifyModule.verifyBlock).to.be.a('function');
			expect(blocksVerifyModule.addBlockProperties).to.be.a('function');
			expect(blocksVerifyModule.deleteBlockProperties).to.be.a('function');
			expect(blocksVerifyModule.processBlock).to.be.a('function');
			return expect(blocksVerifyModule.onBind).to.be.a('function');
		});
	});

	describe('__private.checkTransaction', () => {
		const dummyBlock = { id: '5', height: 5 };
		const dummyTransaction = { id: '5', type: 0 };
		describe('library.logic.transaction.getId', () => {
			describe('when fails', () => {
				beforeEach(() => {
					return library.logic.transaction.getId.throws('getId-ERR');
				});
				it('should call a callback with error', done => {
					__private.checkTransaction(dummyBlock, dummyTransaction, err => {
						expect(err).to.equal('getId-ERR');
						done();
					});
				});
			});
			describe('when succeeds', () => {
				beforeEach(() => {
					return library.logic.transaction.getId.returns('4');
				});
				describe('library.logic.transaction.checkConfirmed', () => {
					describe('when fails', () => {
						beforeEach(() => {
							return library.logic.transaction.checkConfirmed.callsArgWith(
								1,
								'checkConfirmed-ERR',
								null
							);
						});
						afterEach(() => {
							expect(modules.delegates.fork.calledOnce).to.be.true;
							expect(modules.delegates.fork.args[0][0]).to.deep.equal(
								dummyBlock
							);
							return expect(modules.delegates.fork.args[0][1]).to.equal(2);
						});
						describe('modules.transactions.undoUnconfirmed', () => {
							describe('when fails', () => {
								beforeEach(() => {
									return modules.transactions.undoUnconfirmed.callsArgWith(
										1,
										'undoUnconfirmed-ERR',
										null
									);
								});
								afterEach(() => {
									expect(
										modules.transactions.removeUnconfirmedTransaction.calledOnce
									).to.be.true;
									return expect(
										modules.transactions.removeUnconfirmedTransaction.args[0][0]
									).to.equal('4');
								});
								it('should call a callback with error', done => {
									__private.checkTransaction(
										dummyBlock,
										dummyTransaction,
										err => {
											expect(err).to.equal('undoUnconfirmed-ERR');
											done();
										}
									);
								});
							});
							describe('when succeeds', () => {
								beforeEach(() => {
									return modules.transactions.undoUnconfirmed.callsArgWith(
										1,
										null,
										true
									);
								});
								afterEach(() => {
									expect(
										modules.transactions.removeUnconfirmedTransaction.calledOnce
									).to.be.true;
									return expect(
										modules.transactions.removeUnconfirmedTransaction.args[0][0]
									).to.equal('4');
								});
								it('should call a callback with error', done => {
									__private.checkTransaction(
										dummyBlock,
										dummyTransaction,
										err => {
											expect(err).to.equal('checkConfirmed-ERR');
											done();
										}
									);
								});
							});
						});
					});
					describe('when succeeds', () => {
						beforeEach(() => {
							return library.logic.transaction.checkConfirmed.callsArgWith(
								1,
								null,
								true
							);
						});
						describe('modules.accounts.getAccount', () => {
							describe('when fails', () => {
								beforeEach(() => {
									return modules.accounts.getAccount.callsArgWith(
										1,
										'getAccount-ERR',
										null
									);
								});
								it('should call a callback with error', done => {
									__private.checkTransaction(
										dummyBlock,
										dummyTransaction,
										err => {
											expect(err).to.equal('getAccount-ERR');
											done();
										}
									);
								});
							});
							describe('when succeeds', () => {
								beforeEach(() => {
									return modules.accounts.getAccount.callsArgWith(
										1,
										null,
										true
									);
								});
								describe('library.logic.transaction.verify', () => {
									describe('when fails', () => {
										beforeEach(() => {
											return library.logic.transaction.verify.callsArgWith(
												2,
												'verify-ERR',
												null
											);
										});
										it('should call a callback with error', done => {
											__private.checkTransaction(
												dummyBlock,
												dummyTransaction,
												err => {
													expect(err).to.equal('verify-ERR');
													done();
												}
											);
										});
									});
									describe('when succeeds', () => {
										beforeEach(() => {
											return library.logic.transaction.verify.callsArgWith(
												2,
												null,
												true
											);
										});
										it('should call a callback with no error', done => {
											__private.checkTransaction(
												dummyBlock,
												dummyTransaction,
												err => {
													expect(err).to.be.null;
													done();
												}
											);
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});
});
