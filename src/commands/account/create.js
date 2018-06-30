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
import BaseCommand from '../../base';
import cryptography from '../../utils/cryptography';
import { createMnemonicPassphrase } from '../../utils/mnemonic';

export default class CreateCommand extends BaseCommand {
	async run() {
		const passphrase = createMnemonicPassphrase();
		const { privateKey, publicKey } = cryptography.getKeys(passphrase);
		const { address } = cryptography.getAddressFromPublicKey(publicKey);
		this.print({
			passphrase,
			privateKey,
			publicKey,
			address,
		});
	}
}

CreateCommand.flags = {
	...BaseCommand.flags,
};

CreateCommand.description = `
Returns a randomly-generated mnemonic passphrase with its corresponding public key and address.
`;
CreateCommand.examples = ['account:create'];
