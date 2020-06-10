/*
 * LiskHQ/lisk-commander
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
 *
 */
import {
	getAddressFromPublicKey,
	getKeys,
	getBase32AddressFromPublicKey,
} from '@liskhq/lisk-cryptography';
import { flags as flagParser } from '@oclif/command';

import BaseCommand from '../../base';
import { createMnemonicPassphrase } from '../../utils/mnemonic';

interface AccountInfo {
	readonly address: string;
	readonly binaryAddress: string;
	readonly passphrase: string;
	readonly privateKey: string;
	readonly publicKey: string;
}

const createAccount = (): AccountInfo => {
	const passphrase = createMnemonicPassphrase();
	const { privateKey, publicKey } = getKeys(passphrase);
	const binaryAddress = getAddressFromPublicKey(publicKey);
	const address = getBase32AddressFromPublicKey(publicKey, 'lsk');

	return {
		passphrase,
		privateKey: privateKey.toString('base64'),
		publicKey: publicKey.toString('base64'),
		binaryAddress: binaryAddress.toString('base64'),
		address,
	};
};

export default class CreateCommand extends BaseCommand {
	static description = `
		Returns a randomly-generated mnemonic passphrase with its corresponding public/private key pair and Lisk address.
	`;

	static examples = ['account:create', 'account:create --number=3'];

	static flags = {
		...BaseCommand.flags,
		number: flagParser.string({
			char: 'n',
			description: 'Number of accounts to create.',
			default: '1',
		}),
	};

	// eslint-disable-next-line @typescript-eslint/require-await
	async run(): Promise<void> {
		const {
			flags: { number: numberStr },
		} = this.parse(CreateCommand);
		const numberOfAccounts = parseInt(numberStr, 10);
		if (
			numberStr !== numberOfAccounts.toString() ||
			!Number.isInteger(numberOfAccounts) ||
			numberOfAccounts <= 0
		) {
			throw new Error('Number flag must be an integer and greater than 0');
		}
		const accounts = new Array(numberOfAccounts).fill(0).map(createAccount);
		this.print(accounts);
	}
}
