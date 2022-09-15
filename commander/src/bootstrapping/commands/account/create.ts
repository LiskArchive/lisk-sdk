/*
 * LiskHQ/lisk-commander
 * Copyright © 2021 Lisk Foundation
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
import { Command, Flags as flagParser } from '@oclif/core';
import * as cryptography from '@liskhq/lisk-cryptography';
import * as passphrase from '@liskhq/lisk-passphrase';

interface AccountInfo {
	readonly address: string;
	readonly passphrase: string;
	readonly privateKey: string;
	readonly publicKey: string;
	readonly blsPrivateKey: string;
	readonly blsPublicKey: string;
}

const createAccount = (prefix: string): AccountInfo => {
	const generatedPassphrase = passphrase.Mnemonic.generateMnemonic();
	const { privateKey, publicKey } = cryptography.legacy.getKeys(generatedPassphrase);
	const blsPrivateKey = cryptography.bls.generatePrivateKey(
		Buffer.from(generatedPassphrase, 'utf-8'),
	);
	const blsPublicKey = cryptography.bls.getPublicKeyFromPrivateKey(blsPrivateKey);
	const address = cryptography.address.getLisk32AddressFromPublicKey(publicKey, prefix);

	return {
		passphrase: generatedPassphrase,
		privateKey: privateKey.toString('hex'),
		publicKey: publicKey.toString('hex'),
		blsPrivateKey: blsPrivateKey.toString('hex'),
		blsPublicKey: blsPublicKey.toString('hex'),
		address,
	};
};

export class CreateCommand extends Command {
	static description =
		'Return randomly-generated mnemonic passphrase with its corresponding public/private key pair and Lisk address.';

	static examples = ['account:create', 'account:create --count=3'];

	static flags = {
		count: flagParser.string({
			char: 'c',
			description: 'Number of accounts to create.',
			default: '1',
		}),
	};

	async run(): Promise<void> {
		const {
			flags: { count },
		} = await this.parse(CreateCommand);
		const numberOfAccounts = parseInt(count, 10);
		if (
			count !== numberOfAccounts.toString() ||
			!Number.isInteger(numberOfAccounts) ||
			numberOfAccounts <= 0
		) {
			throw new Error('Count flag must be an integer and greater than 0.');
		}
		const accounts = new Array(numberOfAccounts)
			.fill(0)
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			.map(() => createAccount(this.config.pjson.lisk.addressPrefix));
		this.log(JSON.stringify(accounts, undefined, ' '));
	}
}
