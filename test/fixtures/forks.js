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

const randomstring = require('randomstring');
const stampit = require('stampit');

const Fork = stampit({
	props: {
		delegatePublicKey: '',
		blockTimestamp: '',
		blockId: '',
		blockHeight: '',
		previousBlock: '',
		cause: '',
	},
	init({ cause }) {
		this.delegatePublicKey = randomstring
			.generate({ charset: '0123456789ABCDE', length: 32 })
			.toLowerCase();
		this.blockTimestamp = +(+new Date('2012.08.10') / 1000).toFixed(0);
		this.blockId = randomstring.generate({ charset: 'numeric', length: 20 });
		this.blockHeight = parseInt(
			randomstring.generate({ charset: 'numeric', length: 2 })
		);
		this.previousBlock = randomstring.generate({
			charset: 'numeric',
			length: 20,
		});
		this.cause =
			cause ||
			parseInt(randomstring.generate({ charset: 'numeric', length: 2 }));
	},
});

module.exports = {
	Fork,
};
