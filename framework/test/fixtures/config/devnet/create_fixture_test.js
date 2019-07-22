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
 *
 */

'use strict';

const { create, genesisBlock } = require('./create_fixture');

const blocks = new Array(10).fill(0).reduce(
	(rev, current) => {
		const lastBlock = rev[rev.length - 1];
		const block = create([], lastBlock, current + 2);
		rev.push(block);
		return rev;
	},
	[genesisBlock]
);

// eslint-disable-next-line
console.log(blocks);
