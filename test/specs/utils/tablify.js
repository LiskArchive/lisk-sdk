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
import {
	givenAnEmptyObject,
	givenANonEmptyObject,
	givenAnArrayOfObjectsWithTheSameKeys,
	givenAnArrayOfObjectsWithDivergentKeys,
} from '../../steps/1_given';
import {
	whenTheObjectIsTablified,
	whenTheArrayIsTablified,
} from '../../steps/2_when';
import {
	thenTheReturnedTableShouldHaveNoHead,
	thenTheReturnedTableShouldHaveNoRows,
	thenTheReturnedTableShouldHaveAHeadWithTheObjectKeys,
	thenTheReturnedTableShouldHaveARowWithTheObjectValues,
	thenTheReturnedTableShouldHaveAHeadWithTheObjectsKeys,
	thenTheReturnedTableShouldHaveARowForEachObjectWithTheObjectValues,
	thenTheReturnedTableShouldHaveAHeadWithEveryUniqueKey,
	thenTheReturnedTableShouldHaveARowForEachObjectWithTheObjectsValues,
} from '../../steps/3_then';

describe('tablify util', () => {
	describe('Given an empty object', () => {
		beforeEach(givenAnEmptyObject);

		describe('When the object is tablified', () => {
			beforeEach(whenTheObjectIsTablified);

			it('Then the returned table should have no head', thenTheReturnedTableShouldHaveNoHead);
			it('Then the returned table should have no rows', thenTheReturnedTableShouldHaveNoRows);
		});
	});

	describe('Given a non-empty object', () => {
		beforeEach(givenANonEmptyObject);

		describe('When the object is tablified', () => {
			beforeEach(whenTheObjectIsTablified);

			it('Then the returned table should have a head with the object’s keys', thenTheReturnedTableShouldHaveAHeadWithTheObjectKeys);
			it('Then the returned table should have a row with the object’s values', thenTheReturnedTableShouldHaveARowWithTheObjectValues);
		});
	});

	describe('Given an array of objects with the same keys', () => {
		beforeEach(givenAnArrayOfObjectsWithTheSameKeys);

		describe('When the array is tablified', () => {
			beforeEach(whenTheArrayIsTablified);

			it('Then the returned table should have a head with the objects’ keys', thenTheReturnedTableShouldHaveAHeadWithTheObjectsKeys);
			it('Then the returned table should have a row for each object with the object’s values', thenTheReturnedTableShouldHaveARowForEachObjectWithTheObjectValues);
		});
	});

	describe('Given an array of objects with divergent keys', () => {
		beforeEach(givenAnArrayOfObjectsWithDivergentKeys);

		describe('When the array is tablified', () => {
			beforeEach(whenTheArrayIsTablified);

			it('Then the returned table should have a head with every unique key', thenTheReturnedTableShouldHaveAHeadWithEveryUniqueKey);
			it('Then the returned table should have a row for each object with the object’s values', thenTheReturnedTableShouldHaveARowForEachObjectWithTheObjectsValues);
		});
	});
});
