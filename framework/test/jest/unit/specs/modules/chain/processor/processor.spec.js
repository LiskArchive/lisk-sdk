/*
 * Copyright © 2019 Lisk Foundation
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

describe('processor', () => {
	describe('constructor', () => {
		describe('when the instance is created', () => {
			it.todo('should initialize the processors');
			it.todo('should initialize the matchers');
			it.todo('should assign channel to its context');
			it.todo('should assign storage to its context');
			it.todo('should assign blocks module to its context');
			it.todo('should assign logger to its context');
			it.todo('should assign interfaceAdapters to its context');
		});
	});

	describe('init', () => {
		describe('when genesis block does not exist on the storage', () => {
			it.todo('');
		});

		describe('when blockchain data requires rebuild', () => {
			it.todo('');
		});

		describe('when blockchain data contains a invalid block on tip', () => {
			it.todo('');
		});

		describe('when blockchain is sane and genesis block already exists', () => {
			it.todo('');
		});
	});

	describe('register', () => {
		describe('when processor is register without version property', () => {
			it.todo('');
		});

		describe('when processor is register without matcher', () => {
			it.todo('');
		});

		describe('when processor is register with matcher', () => {
			it.todo('');
		});
	});

	describe('rebuild', () => {
		it.todo('should reset all the mem tables');
		describe('when target height is not specified', () => {});

		describe('when loadPerIteration is specified', () => {});

		describe('when loadPerIteration is not specified', () => {});
	});

	describe('process', () => {
		describe('when only 1 processor is registered', () => {});

		describe('when more than 2 processor is registered', () => {});

		describe('when the block is not valid as a new block', () => {});

		describe('when the block is not valid', () => {});

		describe('when the block is fork status discarded', () => {});

		describe('when the block is fork status sync', () => {});

		describe('when the block is fork status revert', () => {});

		describe('when block is not verifiable', () => {});

		describe('when block is not applicable', () => {});

		describe('when block cannot be saved', () => {});

		describe('when block successfully processed', () => {});
	});

	describe('create', () => {
		describe('when only 1 processor is registered', () => {});

		describe('when more than 2 processor is registered', () => {});
	});

	describe('validate', () => {
		describe('when only 1 processor is registered', () => {});

		describe('when more than 2 processor is registered', () => {});
	});

	describe('processValidated', () => {
		describe('when only 1 processor is registered', () => {});

		describe('when more than 2 processor is registered', () => {});

		describe('when block is not verifiable', () => {});

		describe('when block is not applicable', () => {});

		describe('when block cannot be saved', () => {});

		describe('when block successfully processed', () => {});
	});

	describe('apply', () => {
		describe('when only 1 processor is registered', () => {});

		describe('when more than 2 processor is registered', () => {});

		describe('when block is not verifiable', () => {});

		describe('when block is not applicable', () => {});

		describe('when block successfully processed', () => {});
	});

	describe('deleteLastBlock', () => {
		describe('when only 1 processor is registered', () => {});

		describe('when more than 2 processor is registered', () => {});

		describe('when undo step fails', () => {});

		describe('when removing block fails', () => {});
	});
});
