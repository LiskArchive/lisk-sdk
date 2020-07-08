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

const { getKeys, hash } = require('@liskhq/lisk-cryptography');
const { Mnemonic } = require('@liskhq/lisk-passphrase');
const fs = require('fs');

const [numberOfDelegates = 103, filePath] = process.argv.slice(2);

const generateDelegates = num => {
	const delegateList = [];
	for (let i = 0; i < num; i += 1) {
		const passphrase = Mnemonic.generateMnemonic();
		const { publicKey } = getKeys(passphrase);
		const address = hash(Buffer.from(publicKey, 'hex')).slice(0, 20).toString('hex');

		delegateList.push({
			address,
		});
	}

	return { delegateList };
};

const delegates = generateDelegates(numberOfDelegates);

if (!filePath) {
	console.info(delegates);
	process.exit(0);
}

fs.writeFileSync(filePath, JSON.stringify(delegates, undefined, '\t'));
