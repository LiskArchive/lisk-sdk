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
import * as validUnlockTransactionScenario from '../fixtures/unlock_transaction/unlock_transaction.json';

import { unlockToken } from '../src/unlock_token';
import { TransactionJSON } from '../src/types';

describe('#unlockToken transaction', () => {
	let unlockTokenTransaction: Partial<TransactionJSON>;

	// TODO: Update after updating protocol-specs
	describe.skip('when the transaction is created with one passphrase and the unlocking objects', () => {
		beforeEach(() => {
			unlockTokenTransaction = unlockToken({
				passphrase:
					validUnlockTransactionScenario.testCases.input.account.passphrase,
				unlockObjects: validUnlockTransactionScenario.testCases.output.asset.unlockObjects.slice(),
				networkIdentifier:
					validUnlockTransactionScenario.testCases.input.networkIdentifier,
				fee: validUnlockTransactionScenario.testCases.output.fee,
				nonce: validUnlockTransactionScenario.testCases.output.nonce,
			});
		});

		it('should create a unlock transaction', () => {
			expect(unlockTokenTransaction.id).toEqual(
				validUnlockTransactionScenario.testCases.output.id,
			);
			expect(unlockTokenTransaction.signatures).toStrictEqual(
				validUnlockTransactionScenario.testCases.output.signatures,
			);
		});
	});

	// TODO: Update after updating protocol-specs
	describe.skip('when the unlock transaction is create with invalid values', () => {
		describe('given undefined unlocking objects', () => {
			it('should throw error when unlocking objects were not provided', () => {
				return expect(() =>
					unlockToken({
						passphrase:
							validUnlockTransactionScenario.testCases.input.account.passphrase,
						unlockObjects: undefined,
						networkIdentifier:
							validUnlockTransactionScenario.testCases.input.networkIdentifier,
						fee: validUnlockTransactionScenario.testCases.output.fee,
						nonce: validUnlockTransactionScenario.testCases.output.nonce,
					}),
				).toThrow('Unlocking object must present to create transaction.');
			});
		});

		describe('given negative amount of unlocking object', () => {
			it('should throw a validation error', () => {
				return expect(() =>
					unlockToken({
						passphrase:
							validUnlockTransactionScenario.testCases.input.account.passphrase,
						unlockObjects: [
							...validUnlockTransactionScenario.testCases.output.asset.unlockObjects.slice(
								0,
								19,
							),
							{
								delegateAddress: '123L',
								amount: '-1000000000',
								unvoteHeight: 1,
							},
						],
						networkIdentifier:
							validUnlockTransactionScenario.testCases.input.networkIdentifier,
						fee: validUnlockTransactionScenario.testCases.output.fee,
						nonce: validUnlockTransactionScenario.testCases.output.nonce,
					}),
				).toThrow('Amount cannot be less than or equal to zero');
			});
		});

		describe('given more than 20 unlocking objects', () => {
			it('should throw a validation error', () => {
				return expect(() =>
					unlockToken({
						passphrase:
							validUnlockTransactionScenario.testCases.input.account.passphrase,
						unlockObjects: [
							...validUnlockTransactionScenario.testCases.output.asset.unlockObjects.slice(),
							{
								delegateAddress: '123L',
								amount: '1000000000',
								unvoteHeight: 1,
							},
						],
						networkIdentifier:
							validUnlockTransactionScenario.testCases.input.networkIdentifier,
						fee: validUnlockTransactionScenario.testCases.output.fee,
						nonce: validUnlockTransactionScenario.testCases.output.nonce,
					}),
				).toThrow('should NOT have more than 20 item');
			});
		});
	});

	describe('unsigned unlock transaction', () => {
		describe('when the unlock transaction is created without a passphrase', () => {
			beforeEach(() => {
				unlockTokenTransaction = unlockToken({
					unlockObjects: validUnlockTransactionScenario.testCases.output.asset.unlockObjects.slice(),
					networkIdentifier:
						validUnlockTransactionScenario.testCases.input.networkIdentifier,
					fee: validUnlockTransactionScenario.testCases.output.fee,
					nonce: validUnlockTransactionScenario.testCases.output.nonce,
				});
			});

			it('should have the type', () => {
				return expect(unlockTokenTransaction).toHaveProperty('type', 14);
			});

			it('should not have the sender public key', () => {
				return expect(unlockTokenTransaction).toHaveProperty(
					'senderPublicKey',
					undefined,
				);
			});

			it('should have the asset with the unlockObjects', () => {
				return expect(unlockTokenTransaction.asset).toHaveProperty(
					'unlockObjects',
				);
			});

			it('should not have the signatures', () => {
				return expect(unlockTokenTransaction).not.toHaveProperty('signatures');
			});

			it('should not have the id', () => {
				return expect(unlockTokenTransaction).not.toHaveProperty('id');
			});
		});
	});
});
