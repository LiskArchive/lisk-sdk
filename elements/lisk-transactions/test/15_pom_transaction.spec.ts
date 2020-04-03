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
 *
 */
import * as validProofOfMisbehaviorTransactionScenario1 from '../fixtures/proof_of_misbehavior_transaction/proof_of_misbehavior_transaction_scenario_1.json';
import * as validProofOfMisbehaviorTransactionScenario2 from '../fixtures/proof_of_misbehavior_transaction/proof_of_misbehavior_transaction_scenario_2.json';
import * as validProofOfMisbehaviorTransactionScenario3 from '../fixtures/proof_of_misbehavior_transaction/proof_of_misbehavior_transaction_scenario_3.json';

import { ProofOfMisbehaviorTransaction } from '../src/15_proof_of_misbehavior_transaction';
import { Status } from '../src';

describe('Proof-of-misbehavior transaction', () => {
	let transactionWithScenario1: ProofOfMisbehaviorTransaction;
	let transactionWithScenario2: ProofOfMisbehaviorTransaction;
	let transactionWithScenario3: ProofOfMisbehaviorTransaction;

	beforeEach(async () => {
		transactionWithScenario1 = new ProofOfMisbehaviorTransaction({
			...validProofOfMisbehaviorTransactionScenario1.testCases.output,
			networkIdentifier:
				validProofOfMisbehaviorTransactionScenario1.testCases.input
					.networkIdentifier,
		});

		transactionWithScenario2 = new ProofOfMisbehaviorTransaction({
			...validProofOfMisbehaviorTransactionScenario2.testCases.output,
			networkIdentifier:
				validProofOfMisbehaviorTransactionScenario1.testCases.input
					.networkIdentifier,
		});

		transactionWithScenario3 = new ProofOfMisbehaviorTransaction({
			...validProofOfMisbehaviorTransactionScenario3.testCases.output,
			networkIdentifier:
				validProofOfMisbehaviorTransactionScenario1.testCases.input
					.networkIdentifier,
		});
	});

	describe('validateAsset', () => {
		it('should not return errors when first height is greater than or equal to second height but equal maxHeighPrevoted it ', () => {
			const { errors, status } = transactionWithScenario1.validate();
			expect(status).toBe(Status.OK);
			expect(errors).toHaveLength(0);
		});

		it("should not return errors when height is greater than the second header's maxHeightPreviouslyForged", () => {
			const { errors, status } = transactionWithScenario2.validate();
			expect(status).toBe(Status.OK);
			expect(errors).toHaveLength(0);
		});

		it('should not return errors when maxHeightPrevoted is greater than ther second maxHeightPrevoted', () => {
			const { errors, status } = transactionWithScenario3.validate();
			expect(status).toBe(Status.OK);
			expect(errors).toHaveLength(0);
		});

		it('should return errors when headers are not contradicting', () => {
			const nonContradictingTransaction = new ProofOfMisbehaviorTransaction({
				...validProofOfMisbehaviorTransactionScenario1.testCases.output,
				asset: {
					header1:
						validProofOfMisbehaviorTransactionScenario1.testCases.output.asset
							.header1,
					header2:
						validProofOfMisbehaviorTransactionScenario1.testCases.output.asset
							.header1,
				},
				networkIdentifier:
					validProofOfMisbehaviorTransactionScenario1.testCases.input
						.networkIdentifier,
			});

			const { errors, status } = nonContradictingTransaction.validate();
			expect(status).toBe(Status.FAIL);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude(
				'Blockheader ids are identical. No contradiction detected.',
			);
		});
	});

	describe('applyAsset', () => {
		it.todo('should add reward to balance of the sender');
		it.todo('should deduct reward to balance of the misbehaving delegate');

		it.todo(
			'should append height h to pomHeights property of misbehaving account',
		);

		it.todo('should set isBanned property to true is pomHeights.length === 5');

		it.todo('should return errors if misbehaving account is not a delegate');

		it.todo('should return errors if misbehaving account is already banned');

		it.todo(
			'should return errors if misbehaving account is already punished at height h',
		);

		it.todo('should return errors if |header1.height - h| >= 260000');

		it.todo('should return errors if |header2.height - h| >= 260000');
	});

	describe('undoAsset', () => {
		it.todo('should deduct reward to balance of the sender');
		it.todo('should add reward to balance of the misbehaving delegate');

		it.todo(
			'should remove height h from pomHeights property of misbehaving account',
		);

		it.todo(
			'should set isBanned property to false is pomHeights.length becomes less than 5',
		);
	});
});
