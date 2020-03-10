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

'use strict';

// TODO: re-implement for new transaction processing
describe('sort', () => {
	describe('SortBy', () => {
		describe('when given as string', () => {
			it.todo('should return empty object when sort is empty string');
			it.todo('should return ASC as default sort type if only key is provided');
			it.todo('should return ASC as default sort type if sort type is missing');
			it.todo(
				'should return error if sort key not present in options.sortFields',
			);

			it.todo('should return valid sort object if provided with sort:asc');

			it.todo('should return valid sort object if provided with sort:desc');

			it.todo(
				'should return valid sort object with default sort type provided with sort:unknown',
			);
		});

		describe('when given as object', () => {
			it.todo(
				'should return object with empty values when sort is empty object',
			);

			it.todo('should return valid sort object if a valid object given');

			it.todo(
				'should return error when keys are not present in options.sortFields',
			);

			it.todo(
				'should return object with string values if single key object is given',
			);

			it.todo(
				'should return object with array values if multiple keys object is given',
			);
		});
	});
});
