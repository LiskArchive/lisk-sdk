/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
				'the returned table should have a row with the object’s key values',
				then.theReturnedTableShouldHaveARowWithTheObjectKeyValues,
			);
		});
	});
	Given(
		'an object with an array of objects',
		given.anObjectWithAnArrayOfObjects,
		() => {
			When('the object is tablified', when.theObjectIsTablified, () => {
				Then(
					'the returned table should have a row with the object key and stringified nested values',
					then.theReturnedTableShouldHaveARowWithTheObjectKeyAndStringifiedNestedValues,
				);
			});
		},
	);
	Given('a nested object', given.aNestedObject, () => {
		When('the object is tablified', when.theObjectIsTablified, () => {
			Then(
				'the returned table should have a row with the object key and stringified nested values',
				then.theReturnedTableShouldHaveARowWithTheObjectKeyAndStringifiedNestedValues,
			);
		});
	});
	Given('a deeply nested object', given.aDeeplyNestedObject, () => {
		When('the object is tablified', when.theObjectIsTablified, () => {
			Then(
				'the returned table should have a row with the object key and stringified nested values',
				then.theReturnedTableShouldHaveARowWithTheObjectKeyAndStringifiedNestedValues,
			);
		});
	});
	Given('a cyclic object', given.aCyclicObject, () => {
		When('the object is tablified', when.theObjectIsTablified, () => {
			Then(
				'it should throw type error "Converting circular structure to JSON"',
				then.itShouldThrowTypeError,
			);
		});
	});
	Given(
		'an array of objects with the same keys',
		given.anArrayOfObjectsWithTheSameKeys,
		() => {
			When('the array is tablified', when.theArrayIsTablified, () => {
				Then(
					'the returned table should have head rows',
					then.theReturnedTableShouldHaveHeaderRows,
				);
				Then(
					'the returned table should have rows with the object key and stringified values',
					then.theReturnedTableShouldHaveRowsWithTheObjectKeyAndStringifiedValues,
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
					'the returned table should have head rows',
					then.theReturnedTableShouldHaveHeaderRows,
				);
				Then(
					'the returned table should have rows with the object key and stringified values',
					then.theReturnedTableShouldHaveRowsWithTheObjectKeyAndStringifiedValues,
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
					'the returned table should have head rows',
					then.theReturnedTableShouldHaveHeaderRows,
				);
				Then(
					'the returned table should have rows with the object key and stringified values',
					then.theReturnedTableShouldHaveRowsWithTheObjectKeyAndStringifiedNestedValues,
				);
			});
		},
	);
});
