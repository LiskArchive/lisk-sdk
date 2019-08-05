'use strict';

const expect = require('chai').expect;
const localCommon = require('../common');
const accountFixtures = require('../../fixtures/accounts');

describe('delegates', () => {
	let library;

	localCommon.beforeBlock('delegates_synchronous_tasks', lib => {
		library = lib;
	});

	describe('#deleteDelegateListUntilRound', () => {
		before(async () => {
			// Arrange
			new Array(10).fill(0).forEach((_, index) => {
				const randomDelegateList = new Array(101)
					.fill(0)
					.map(() => new accountFixtures.Account().publicKey);
				library.components.storage.entities.RoundDelegates.create({
					round: index + 1,
					delegatePublicKeys: randomDelegateList,
				});
			});
			// Act
			await library.modules.dpos.delegate.deleteDelegateListUntilRound(5);
		});

		it('should remove delegatesList until the round 5', async () => {
			// Arrange
			const deletedRoundNumbers = [1, 2, 3, 4];
			// Act
			deletedRoundNumbers.forEach(async round => {
				const delegateListForRoundOne = await library.components.storage.entities.RoundDelegates.getRoundDelegates(
					round,
				);
				// Assert
				expect(delegateListForRoundOne).to.be.empty;
			});
		});

		it('should not remove delegateList above and including round 5', async () => {
			// Arrange
			const deletedRoundNumbers = [5, 6, 7, 8, 9, 10];
			// Act
			deletedRoundNumbers.forEach(async round => {
				const delegateListForRoundOne = await library.components.storage.entities.RoundDelegates.getRoundDelegates(
					round,
				);
				// Assert
				expect(delegateListForRoundOne).to.have.lengthOf(101);
			});
		});
	});
});
