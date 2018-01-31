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

var randomstring = require('randomstring');

var randomNormalizedPeer = {
	broadhash: '198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d',
	height: 1,
	ip: '40.40.40.40',
	os: 'unknown',
	wsPort: 5000,
	httpPort: 4000,
	state: 2,
	version: '0.0.0',
	nonce: randomstring.generate(16),
};

function generateRandomActivePeer() {
	var randomDigits = function(length) {
		return randomstring.generate({ charset: 'numeric', length: length });
	};
	return {
		broadhash: randomstring.generate(64),
		dappid: null,
		height: randomDigits(4),
		ip: `${randomDigits(3)}.${randomDigits(3)}.${randomDigits(
			3
		)}.${randomDigits(3)}`,
		os: randomstring.generate(10),
		wsPort: `5${randomstring.generate({ charset: 'numeric', length: 3 })}`,
		httpPort: `4${randomstring.generate({ charset: 'numeric', length: 3 })}`,
		state: 2,
		nonce: randomstring.generate(16),
		version: `${randomDigits(1)}.${randomDigits(1)}.${randomDigits(1)}`,
	};
}

module.exports = {
	randomNormalizedPeer: randomNormalizedPeer,
	generateRandomActivePeer: generateRandomActivePeer,
};
