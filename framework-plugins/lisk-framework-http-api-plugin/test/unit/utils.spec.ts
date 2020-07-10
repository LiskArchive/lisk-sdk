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

import { paginateList } from '../../src/utils';

describe('paginateList', () => {
	const exampleArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
	const exampleArrayLength = exampleArray.length;

	it('should return all elements when limit and offset are not provided', () => {
		expect(paginateList(exampleArray)).toEqual(exampleArray);
	});

	it('should return only first 5 elements when limit is 5', () => {
		expect(paginateList(exampleArray, 5)).toEqual(exampleArray.slice(0, 5));
	});

	it('should return elements after 5th element when offset and limit are 5', () => {
		expect(paginateList(exampleArray, 5, 5)).toEqual(exampleArray.slice(5, exampleArrayLength));
	});
});
