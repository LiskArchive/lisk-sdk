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

const { Suite } = require('benchmark');
const { calculateDiff, undo } = require('../dist-node/diff');

const suite = new Suite();

const senderAccount = {
	address: '5059876081639179984L',
	publicKey: '0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
	username: null,
	isValidator: false,
	nonce: '103',
	balance: 9897000000000000,
	fees: '0',
	rewards: '0',
};

const previousSenderStateBuffer = Buffer.from(JSON.stringify(senderAccount));

const multiSignatureAccount = {
	...senderAccount,
	keys: {
		numberOfSignatures: 3,
		mandatoryKeys: [
			'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
			'ff30ef40b7de42114137be46f1009d30e5c19809a73d5a162bc99f7e7681d63d',
		],
		optionalKeys: [
			'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
			'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
		],
	},
};

const multiSignatureAccountBuffer = Buffer.from(JSON.stringify(multiSignatureAccount));
const diff = calculateDiff(previousSenderStateBuffer, multiSignatureAccountBuffer);

/**
 * calculateDiff x 119,928 ops/sec ±1.27% (86 runs sampled)
 * undo x 50,030 ops/sec ±0.78% (89 runs sampled)
 */
suite
	.add('calculateDiff', () => {
		calculateDiff(previousSenderStateBuffer, multiSignatureAccountBuffer);
	})
	.add('undo', () => {
		undo(multiSignatureAccountBuffer, diff);
	})
	.on('cycle', function (event) {
		console.log(String(event.target));
	})
	.run({ async: true });
