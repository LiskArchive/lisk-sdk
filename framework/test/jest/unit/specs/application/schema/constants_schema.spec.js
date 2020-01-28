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
 */

'use strict';

const constantsSchema = require('../../../../../../src/application/schema/constants_schema');

describe('schema/constants_schema.js', () => {
	it('constants schema must match to the snapshot.', () => {
		expect(constantsSchema).toMatchSnapshot();
	});
});
