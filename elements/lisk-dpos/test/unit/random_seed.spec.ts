/*
 * Copyright © 2020 Lisk Foundation
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

describe('random seeds', () => {
	describe('first round', () => {
		describe('random seed 1', () => {
			it.todo('should generate random seed 1 as H(52)');
			it.todo('should return a 128-bit string');
		});
		describe('random seed 2', () => {
			it.todo('should generate random seed 2 as H(0)');
			it.todo('should return a 128-bit string');
		});
	});

	describe('round greater than first round', () => {
		describe('random seed 1', () => {
			it.todo('should throw error if middle of round is not passed');
			it.todo(
				'should fetch seedReveal for blocks from middle of last round to middle of current round',
			);
			it.todo(
				'should exclude seedReveal if forger did not forge previously in the same round and also not forged in the previous round',
			);
			it.todo(
				'should include seedReveal if forger forged in previously in the same round',
			);
			it.todo(
				'should include seedReveal if forger did not forge previously in the same round but forged in previous round',
			);
			it.todo(
				'should include seedReveal if its valid pre-image for block forged upto last round',
			);
			it.todo(
				'should not include seedReveal if its not valid pre-image for lat forged block',
			);
			it.todo(
				'should calculate hash for integer value of height for middle of current round',
			);
			it.todo('should perform bitwise exclusive or for above value');
			it.todo('should return a 128-bit string');
		});

		describe('random seed 2', () => {
			it.todo('should throw error if middle of round is not passed');
			it.todo(
				'should fetch seedReveal for blocks from start to end of last round',
			);
			it.todo(
				'should exclude seedReveal if forger did not forge previously in the same round and also not forged in the previous round',
			);
			it.todo(
				'should include seedReveal if forger forged in previously in the same round',
			);
			it.todo(
				'should include seedReveal if forger did not forge previously in the same round but forged in previous round',
			);
			it.todo(
				'should include seedReveal if its valid pre-image for block forged upto last round',
			);
			it.todo(
				'should not include seedReveal if its not valid pre-image for lat forged block',
			);
			it.todo(
				'should calculate hash for integer value of height for last block of last round',
			);
			it.todo('should perform bitwise exclusive or for above value');
			it.todo('should return a 128-bit string');
		});
	});
});
