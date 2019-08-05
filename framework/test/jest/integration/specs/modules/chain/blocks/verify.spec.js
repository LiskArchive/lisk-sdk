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

// This test should be unit test
describe('blocks/verify', () => {
	describe('when blockSignature property is not a hex string and verifySignature is called', () => {
		it.todo('should fail');
	});

	describe('when blockSignature property is an invalid hex string and verifySignature is called', () => {
		it.todo('should fail');
	});

	describe('when generatorPublicKey property is not a hex string and verifySignature is called', () => {
		it.todo('should fail');
	});

	describe('when generatorPublicKey property is an invalid hex string and verifySignature is called', () => {
		it.todo('should fail');
	});

	describe('when previousBlock property is missing and verifyPreviousBlock is called', () => {
		it.todo('should fail');
	});

	describe('when block version is not 0 and verifyVersion is called', () => {
		it.todo('should fail');
	});

	describe('when block reward = 99 instead of 0 and verifyReward is called', () => {
		it.todo('should fail');
	});

	describe('when block id is an invalid alpha-numeric string value and verifyId is called', () => {
		it.todo('should reset block id');
	});

	describe('when block id is an invalid numeric string value and verifyId is called', () => {
		it.todo('should reset block id');
	});

	describe('when block id is an invalid integer value and verifyId is called', () => {
		it.todo('should reset block id');
	});

	describe('when block id is a valid integer value and verifyId is called', () => {
		it.todo('should reset block id');
	});

	describe('verifyPayload', () => {
		it.todo(
			'should fail when payload length greater than MAX_PAYLOAD_LENGTH constant value',
		);

		it.todo(
			'should fail when transactions length != numberOfTransactions property',
		);

		it.todo(
			'should fail when transactions length > maxTransactionsPerBlock constant value',
		);

		it.todo('should fail when a transaction is of an unknown type');

		it.todo('should fail when a transaction is duplicated');

		it.todo('should fail when payload hash is invalid');

		it.todo(
			'should fail when summed transaction amounts do not match totalAmount property',
		);

		it.todo(
			'should fail when summed transaction fees do not match totalFee property',
		);
	});

	describe('verifyForkOne', () => {
		it.todo('should fail when previousBlock value is invalid');
	});

	describe('verifyBlockSlot', () => {
		it.todo('should fail when block timestamp < than previousBlock timestamp');
	});

	describe('verifyBlockSlotWindow', () => {
		describe('for current slot number', () => {
			it.todo('should return empty result.errors array');
		});

		describe('for slot number BLOCK_SLOT_WINDOW slots in the past', () => {
			it.todo('should return empty result.errors array');
		});

		describe('for slot number in the future', () => {
			it.todo('should call callback with error = Block slot is in the future ');
		});

		describe('for slot number BLOCK_SLOT_WINDOW + 1 slots in the past', () => {
			it.todo('should call callback with error = Block slot is too old');
		});
	});

	describe('onNewBlock', () => {
		describe('with lastNBlockIds', () => {
			describe('when onNewBlock function is called once', () => {
				it.todo('should include block in lastNBlockIds queue');
			});

			describe('when onNewBlock function is called BLOCK_SLOT_WINDOW times', () => {
				it.todo('should include blockId in lastNBlockIds queue');
			});

			describe('when onNewBlock function is called BLOCK_SLOT_WINDOW * 2 times', () => {
				it.todo(
					'should maintain last BLOCK_SLOT_WINDOW blockIds in lastNBlockIds queue',
				);
			});
		});
	});

	describe('verifyAgainstLastNBlockIds', () => {
		describe('when __private.lastNBlockIds', () => {
			describe('contains block id', () => {
				it.todo(
					'should return result with error = Block already exists in chain',
				);
			});

			describe('does not contain block id', () => {
				it.todo('should return result with no errors');
			});
		});
	});

	describe('verifyReceipt', () => {});

	describe('verifyBlock', () => {});

	describe('addBlockProperties', () => {});

	describe('deleteBlockProperties', () => {});

	// Sends a block to network, save it locally
	describe('processBlock for valid block {broadcast: true, saveBlock: true}', () => {
		it.todo('should clear database');

		it.todo('should generate block 1');

		it.todo('should be ok when processing block 1');
	});

	describe('processBlock for invalid block {broadcast: true, saveBlock: true}', () => {
		it.todo('should fail when processing block 1 multiple times');
	});

	// Receives a block from network, save it locally
	describe('processBlock for invalid block {broadcast: false, saveBlock: true}', () => {
		it.todo('should generate block 2 with invalid generator slot');

		describe('normalizeBlock validations', () => {
			it.todo('should fail when timestamp property is missing');

			it.todo('should fail when transactions property is missing');

			it.todo('should fail when transaction type property is missing');

			it.todo('should fail when transaction timestamp property is missing');

			it.todo('should fail when block generator is invalid (fork:3)');

			describe('block with processed transaction', () => {
				it.todo(
					'should generate block 1 with valid generator slot and processed transaction',
				);

				it.todo('should fail when transaction is invalid');

				it.todo('should fail when transaction is already confirmed (fork:2)');
			});
		});

		describe('processBlock for valid block {broadcast: false, saveBlock: true}', () => {
			it.todo('should generate block 2 with valid generator slot');

			it.todo('should be ok when processing block 2');
		});
	});
});
