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

const genesisBlockSchema = require('../../../../../../src/controller/schema/genesis_block_schema');

describe('schema/genesis_block_schema.js', () => {
	it('genesis block schema must match to the snapshot.', () => {
		expect(genesisBlockSchema).toMatchSnapshot();
	});
});
