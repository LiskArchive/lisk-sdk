/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import { flags as flagParser } from '@oclif/command';
import * as cryptography from '@liskhq/lisk-cryptography';
import BaseCommand from '../../base';
import { createMnemonicPassphrase } from '../../utils/mnemonic';

const createAccount = () => {
	const passphrase = createMnemonicPassphrase();
	const { privateKey, publicKey } = cryptography.getKeys(passphrase);
	const address = cryptography.getAddressFromPublicKey(publicKey);
	return {
		passphrase,
		privateKey,
		publicKey,
		address,
	};
};

export default class CreateCommand extends BaseCommand {
	async run() {
		const { flags: { number: numberStr } } = this.parse(CreateCommand);
		const number = parseInt(numberStr, 10);
		if (
			numberStr !== number.toString() ||
			!Number.isInteger(number) ||
			number <= 0
		) {
			throw new Error('Number flag must be an integer and greater than 0');
		}
		const accounts = new Array(number).fill().map(createAccount);
		this.print(accounts);
	}
}

CreateCommand.flags = {
	...BaseCommand.flags,
	number: flagParser.string({
		char: 'n',
		description: 'Number of accounts to create.',
		default: '1',
	}),
};

CreateCommand.description = `
Returns a randomly-generated mnemonic passphrase with its corresponding public/private key pair and Lisk address.
`;
CreateCommand.examples = ['account:create', 'account:create --number=3'];
