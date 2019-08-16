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

describe('block processing with loadBlocksWithOffset', () => {
	describe('when block does not contain transactions', () => {
		it.todo('should load block without error');
	});

	describe('when block contain valid transactions', () => {
		it.todo('should load block without error');
	});

	describe('when block header contains invalid block signature', () => {
		it.todo('should throw an error');
	});

	describe('when block header contains invalid payloadHash', () => {
		it.todo('should throw an error');
	});

	describe('when block header contains invalid block timestamp', () => {
		it.todo('should throw an error');
	});

	describe('when block contains transaction type which is not registered', () => {
		it.todo('should throw an error');
	});

	describe('when block header contains invalid block version', () => {
		it.todo('should throw an error');
	});

	describe('when block header contains invalid previous block (fork:1)', () => {
		it.todo('should throw an error');
	});

	describe('when block contains transaction with duplicate votes', () => {
		it.todo('should throw an error');
	});
});
