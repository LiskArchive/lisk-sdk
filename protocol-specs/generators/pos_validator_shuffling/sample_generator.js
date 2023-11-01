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

const { utils, ed } = require('@liskhq/lisk-cryptography');
const { Mnemonic } = require('@liskhq/lisk-passphrase');
const fs = require('fs');

const [numberOfValidators = 103, filePath] = process.argv.slice(2);

const generateValidators = num => {
	const validatorList = [];
	for (let i = 0; i < num; i += 1) {
		const passphrase = Mnemonic.generateMnemonic();
		const { publicKey } = ed.getKeys(passphrase);
		const address = utils.hash(Buffer.from(publicKey, 'hex')).subarray(0, 20);

		validatorList.push({
			address,
		});
	}

	return { validatorList };
};

const validators = generateValidators(numberOfValidators);

if (!filePath) {
	console.info(validators);
	process.exit(0);
}

fs.writeFileSync(filePath, JSON.stringify(validators, undefined, '\t'));
