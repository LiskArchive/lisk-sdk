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
 *
 */
import * as validPoMTransactionScenario from '../fixtures/proof_of_misbehavior_transaction/proof_of_misbehavior_transaction_scenario_1.json';

import { reportMisbehavior } from '../src/report_misbehavior';
import { TransactionJSON } from '../src/transaction_types';

describe('#reportMisbehavior transaction', () => {
	let reportMisbehaviorTransaction: Partial<TransactionJSON>;

	describe('when the transaction is created with one passphrase and the contradicting headers', () => {
		beforeEach(async () => {
			reportMisbehaviorTransaction = reportMisbehavior({
				passphrase:
					validPoMTransactionScenario.testCases.input.reportingAccount
						.passphrase,
				networkIdentifier:
					validPoMTransactionScenario.testCases.input.networkIdentifier,
				fee: validPoMTransactionScenario.testCases.output.fee,
				nonce: validPoMTransactionScenario.testCases.output.nonce,
				header1: validPoMTransactionScenario.testCases.output.asset.header1,
				header2: validPoMTransactionScenario.testCases.output.asset.header2,
			});
		});

		it('should create a report misbehavior transaction', async () => {
			expect(reportMisbehaviorTransaction.id).toEqual(
				validPoMTransactionScenario.testCases.output.id,
			);
			expect(reportMisbehaviorTransaction.signatures).toStrictEqual(
				validPoMTransactionScenario.testCases.output.signatures,
			);
		});
	});

	describe('when the proof of misbehavior transaction is created with the invalid header input', () => {
		it('should throw error when votes was not provided', () => {
			return expect(() =>
				reportMisbehavior({
					passphrase:
						validPoMTransactionScenario.testCases.input.reportingAccount
							.passphrase,
					header1: undefined as any,
					header2: undefined as any,
					networkIdentifier:
						validPoMTransactionScenario.testCases.input.networkIdentifier,
					fee: validPoMTransactionScenario.testCases.output.fee,
					nonce: validPoMTransactionScenario.testCases.output.nonce,
				}),
			).toThrowError('Header 1 is required for poof of misbehavior');
		});
	});

	describe('unsigned misbehavior transaction', () => {
		describe('when the proof of misbehavior transaction is created without a passphrase', () => {
			beforeEach(async () => {
				reportMisbehaviorTransaction = reportMisbehavior({
					header1: validPoMTransactionScenario.testCases.output.asset.header1,
					header2: validPoMTransactionScenario.testCases.output.asset.header2,
					networkIdentifier:
						validPoMTransactionScenario.testCases.input.networkIdentifier,
					fee: validPoMTransactionScenario.testCases.output.fee,
					nonce: validPoMTransactionScenario.testCases.output.nonce,
				});
			});

			it('should have the type', () => {
				return expect(reportMisbehaviorTransaction).toHaveProperty('type', 15);
			});

			it('should not have the sender public key', () => {
				return expect(reportMisbehaviorTransaction).toHaveProperty(
					'senderPublicKey',
					undefined,
				);
			});

			it('should have the asset with the header 1 and header 2', () => {
				expect(reportMisbehaviorTransaction.asset).toHaveProperty('header1');
				expect(reportMisbehaviorTransaction.asset).toHaveProperty('header2');
			});

			it('should not have the signatures', () => {
				return expect(reportMisbehaviorTransaction).not.toHaveProperty(
					'signatures',
				);
			});

			it('should not have the id', () => {
				return expect(reportMisbehaviorTransaction).not.toHaveProperty('id');
			});
		});
	});
});
