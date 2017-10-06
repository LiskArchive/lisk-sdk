/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('tablify util', () => {
	describe('Given an empty object', () => {
		beforeEach(given.anEmptyObject);

		describe('When the object is tablified', () => {
			beforeEach(when.theObjectIsTablified);

			it('Then the returned table should have no head', then.theReturnedTableShouldHaveNoHead);
			it('Then the returned table should have no rows', then.theReturnedTableShouldHaveNoRows);
		});
	});

	describe('Given a non-empty object', () => {
		beforeEach(given.aNonEmptyObject);

		describe('When the object is tablified', () => {
			beforeEach(when.theObjectIsTablified);

			it('Then the returned table should have a head with the object’s keys', then.theReturnedTableShouldHaveAHeadWithTheObjectKeys);
			it('Then the returned table should have a row with the object’s values', then.theReturnedTableShouldHaveARowWithTheObjectValues);
		});
	});

	describe('Given an array of objects with the same keys', () => {
		beforeEach(given.anArrayOfObjectsWithTheSameKeys);

		describe('When the array is tablified', () => {
			beforeEach(when.theArrayIsTablified);

			it('Then the returned table should have a head with the objects’ keys', then.theReturnedTableShouldHaveAHeadWithTheObjectsKeys);
			it('Then the returned table should have a row for each object with the object’s values', then.theReturnedTableShouldHaveARowForEachObjectWithTheObjectValues);
		});
	});

	describe('Given an array of objects with divergent keys', () => {
		beforeEach(given.anArrayOfObjectsWithDivergentKeys);

		describe('When the array is tablified', () => {
			beforeEach(when.theArrayIsTablified);

			it('Then the returned table should have a head with every unique key', then.theReturnedTableShouldHaveAHeadWithEveryUniqueKey);
			it('Then the returned table should have a row for each object with the object’s values', then.theReturnedTableShouldHaveARowForEachObjectWithTheObjectsValues);
		});
	});
});
