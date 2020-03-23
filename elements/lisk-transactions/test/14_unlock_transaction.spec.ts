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

describe('Unlock transaction', () => {
	describe('validateAsset', () => {
		describe('when asset.votes contains valid contents', () => {
			it.todo('should not return errors');
		});

		describe('when asset.unlockingObjects does not include any unlockingObject', () => {
			it.todo('should return errors');
		});

		describe('when asset.unlockingObjects includes more than 20 unlockingObjects', () => {
			it.todo('should return errors');
		});

		describe('when asset.unlockingObjects includes negative amount', () => {
			it.todo('should return errors');
		});

		describe('when asset.unlockingObjects includes zero amount', () => {
			it.todo('should return errors');
		});

		describe('when asset.unlockingObjects includes amount which is not multiple of 10 * 10^8', () => {
			it.todo('should return errors');
		});

		describe('when asset.unlockingObjects includes negative unvoteHeight', () => {
			it.todo('should return errors');
		});
	});

	describe('applyAsset', () => {
		describe('given the delegate is not being punished', () => {
			describe('when asset.unlockingObjects contain valid entries, and voter account has waited 2000 blocks', () => {
				it.todo('should not return error');
				it.todo('should make account to have correct balance');
				it.todo('should remove unlocking from the sender');
			});

			describe('when asset.unlockingObjects contain valid entries, and self-voting account has waited 260,000 blocks', () => {
				it.todo('should not return error');
				it.todo('should make account to have correct balance');
				it.todo('should remove unlocking from the sender');
			});

			describe('when asset.unlockingObjects contain valid entries, and voter account has not waited 2000 blocks', () => {
				it.todo('should return errors');
			});

			describe('when asset.unlockingObjects contain valid entries, and self-voting account has not waited 260,000 blocks', () => {
				it.todo('should return errors');
			});
		});

		describe('given the delegate is currently being punichsed', () => {
			describe('when asset.unlockingObjects contain valid entries, and voter account has waited 260,000 blocks and waited 2,000 blocks', () => {
				it.todo('should not return error');
				it.todo('should make account to have correct balance');
				it.todo('should remove unlocking from the sender');
			});

			describe('when asset.unlockingObjects contain valid entries, and self-voting account has waited pomHeight + 780,000 blocks and waited 260,000 blocks', () => {
				it.todo('should not return error');
				it.todo('should make account to have correct balance');
				it.todo('should remove unlocking from the sender');
			});

			describe('when asset.unlockingObjects contain valid entries, and voter account has waited pomHeight + 260,000 blocks but not waited 2000 blocks', () => {
				it.todo('should return errors');
			});

			describe('when asset.unlockingObjects contain valid entries, and self-voting account has waited pomHeight + 780,000 blocks but not waited 260,000 blocks', () => {
				it.todo('should return errors');
			});

			describe('when asset.unlockingObjects contain valid entries, and voter account has not waited pomHeight + 260,000 blocks but waited 2000 blocks', () => {
				it.todo('should return errors');
			});

			describe('when asset.unlockingObjects contain valid entries, and self-voting account has not waited 780,000 blocks but waited 260,000 blocks', () => {
				it.todo('should return errors');
			});
		});

		describe('when asset.unlockingObjects contain duplicate entries', () => {
			it.todo('should not return error');
			it.todo('should make account to have correct balance');
			it.todo('should remove all duplicate unlocking from the sender');
		});

		describe('when account contain duplicate unlocking entries but asset.unlockingObjects only contains one', () => {
			it.todo('should not return error');
			it.todo('should make account to have correct balance');
			it.todo('should only remove one unlocking from the sender');
		});

		describe('when account.unlocking does not have corresponding unlockingObject', () => {
			it.todo('should return errors');
		});

		describe('when account.unlocking has one entry but it has multiple corresponding unlockingObjects', () => {
			it.todo('should return errors');
		});
	});

	describe('undoAsset', () => {
		describe('when asset.unlockingObjects contain duplicate entries', () => {
			it.todo('should not return error');
			it.todo('should make account to have original values before apply');
		});

		describe('when asset.unlockingObjects contain duplicate entries', () => {
			it.todo('should not return error');
			it.todo('should make account to have original values before apply');
		});
	});
});
