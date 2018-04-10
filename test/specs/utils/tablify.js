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
	Given('an empty object', given.anEmptyObject, () => {
		When('the object is tablified', when.theObjectIsTablified, () => {
			Then(
				'the returned table should have no head',
				then.theReturnedTableShouldHaveNoHead,
			);
			Then(
				'the returned table should have no rows',
				then.theReturnedTableShouldHaveNoRows,
			);
		});
	});
	Given('a non-empty object', given.aNonEmptyObject, () => {
		When('the object is tablified', when.theObjectIsTablified, () => {
			Then(
				'the returned table should have a head with the object’s keys',
				then.theReturnedTableShouldHaveAHeadWithTheObjectKeys,
			);
			Then(
				'the returned table should have a row with the object’s values',
				then.theReturnedTableShouldHaveARowWithTheObjectValues,
			);
		});
	});
	Given('a nested object', given.aNestedObject, () => {
		When('the object is tablified', when.theObjectIsTablified, () => {
			Then(
				'the returned table should have a head with the object’s nested keys',
				then.theReturnedTableShouldHaveAHeadWithTheObjectNestedKeys,
			);
			Then(
				'the returned table should have a row with the object’s nested values',
				then.theReturnedTableShouldHaveAHeadWithTheObjectNestedValues,
			);
		});
	});
	Given('a deeply nested object', given.aDeeplyNestedObject, () => {
		When('the object is tablified', when.theObjectIsTablified, () => {
			Then(
				'it should throw print error "Output cannot be displayed in table format: Maximum object depth of 3 was exceeded. Consider using JSON output format."',
				then.itShouldThrowPrintError,
			);
		});
	});
	Given('a cyclic object', given.aCyclicObject, () => {
		When('the object is tablified', when.theObjectIsTablified, () => {
			Then(
				'it should throw print error "Output cannot be displayed in table format: Maximum object depth of 3 was exceeded. Consider using JSON output format."',
				then.itShouldThrowPrintError,
			);
		});
	});
	Given(
		'an array of objects with the same keys',
		given.anArrayOfObjectsWithTheSameKeys,
		() => {
			When('the array is tablified', when.theArrayIsTablified, () => {
				Then(
					'the returned table should have a head with the objects’ keys',
					then.theReturnedTableShouldHaveAHeadWithTheObjectsKeys,
				);
				Then(
					'the returned table should have a row for each object with the object’s values',
					then.theReturnedTableShouldHaveARowForEachObjectWithTheObjectValues,
				);
			});
		},
	);
	Given(
		'an array of objects with divergent keys',
		given.anArrayOfObjectsWithDivergentKeys,
		() => {
			When('the array is tablified', when.theArrayIsTablified, () => {
				Then(
					'the returned table should have a head with every unique key',
					then.theReturnedTableShouldHaveAHeadWithEveryUniqueKey,
				);
				Then(
					'the returned table should have a row for each object with the object’s values',
					then.theReturnedTableShouldHaveARowForEachObjectWithTheObjectsValues,
				);
			});
		},
	);
	Given(
		'an array of objects with nested keys',
		given.anArrayOfObjectsWithNestedKeys,
		() => {
			When('the array is tablified', when.theArrayIsTablified, () => {
				Then(
					'the returned table should have a head with the objects’ nested keys',
					then.theReturnedTableShouldHaveAHeadWithTheObjectsNestedKeys,
				);
				Then(
					'the returned table should have a row for each object with the object’s values',
					then.theReturnedTableShouldHaveARowForEachObjectWithTheObjectNestedValues,
				);
			});
		},
	);
});
