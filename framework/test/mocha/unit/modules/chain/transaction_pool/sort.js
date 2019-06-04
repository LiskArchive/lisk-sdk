/*
 * Copyright © 2018 Lisk Foundation
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
			// eslint-disable-next-line
			it('should return empty object when sort is empty string');
			// eslint-disable-next-line
			it('should return ASC as default sort type if only key is provided');
			// eslint-disable-next-line
			it('should return ASC as default sort type if sort type is missing');
			// eslint-disable-next-line
			it('should return error if sort key not present in options.sortFields');
			// eslint-disable-next-line
			it('should return valid sort object if provided with sort:asc');
			// eslint-disable-next-line
			it('should return valid sort object if provided with sort:desc');
			// eslint-disable-next-line
			it(
				'should return valid sort object with default sort type provided with sort:unknown'
			);
		});

		describe('when given as object', () => {
			// eslint-disable-next-line
			it('should return object with empty values when sort is empty object');
			// eslint-disable-next-line
			it('should return valid sort object if a valid object given');
			// eslint-disable-next-line
			it('should return error when keys are not present in options.sortFields');
			// eslint-disable-next-line
			it(
				'should return object with string values if single key object is given'
			);
			// eslint-disable-next-line
			it(
				'should return object with array values if multiple keys object is given'
			);
		});
	});
});
