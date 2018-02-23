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
	var library;
	var __private;
	var loggerStub;
	var dbStub;
	var logicBlockStub;
	var logicTransactionStub;
	var blocksVerifyModule;

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
		logicTransactionStub = sinonSandbox.stub();

		blocksVerifyModule = new BlocksVerify(
			loggerStub,
			logicBlockStub,
			logicTransactionStub,
			dbStub
		);

		library = BlocksVerify.__get__('library');
		__private = BlocksVerify.__get__('__private');

		done();
	});

	afterEach(done => {
		sinonSandbox.restore();
		done();
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
});
