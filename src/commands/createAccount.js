/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
import cryptoModule from '../utils/cryptoModule';
import config from '../utils/env';
import { createMnemonicPassphrase } from '../utils/mnemonic';
import { printResult } from '../utils/print';
import commonOptions from '../utils/options';
import {
	shouldUseJsonOutput,
} from '../utils/helpers';

const description = `Create account returns a randomly-generated mnemonic passphrase with its corresponding public key and address.

	Example: create account
`;

const createAccount = vorpal => ({ options }) => {
	const useJsonOutput = shouldUseJsonOutput(config, options);
	const passphrase = createMnemonicPassphrase();
	const { publicKey } = cryptoModule.getKeys(passphrase);
	const { address } = cryptoModule.getAddressFromPublicKey(publicKey);
	const account = {
		passphrase,
		publicKey,
		address,
	};

	return Promise.resolve(printResult(vorpal, { json: useJsonOutput })(account));
};

export default function createAccountCommand(vorpal) {
	vorpal
		.command('create account')
		.option(...commonOptions.json)
		.option(...commonOptions.noJson)
		.description(description)
		.action(createAccount(vorpal));
}
