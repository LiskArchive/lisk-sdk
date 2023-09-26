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
const crypto = require('crypto');
const fs = require('fs');

const [amount = 150, filePath, fixedValue] = process.argv.slice(2);

const generateValidators = (num, fixedNum) => {
	const validatorList = [];
	for (let i = 0; i < num; i += 1) {
		const passphrase = Mnemonic.generateMnemonic();
		const { publicKey } = ed.getKeys(passphrase);
		const address = utils.hash(Buffer.from(publicKey, 'hex')).subarray(0, 20);
		const buf = crypto.randomBytes(8);
		const randomNumber = buf.readBigUInt64BE() / BigInt(10) ** BigInt(8);
		const validatorWeight = fixedValue
			? BigInt(fixedNum)
			: randomNumber - (randomNumber % BigInt(10) ** BigInt(9));
		validatorList.push({
			address,
			validatorWeight,
			// lsk: (validatorWeight / (BigInt(10) ** BigInt(8))),
		});
	}

	return { list: validatorList };
};

const validators = generateValidators(amount, fixedValue);

if (!filePath) {
	console.info(validators);
	process.exit(0);
}

fs.writeFileSync(filePath, JSON.stringify(validators, undefined, '\t'));
