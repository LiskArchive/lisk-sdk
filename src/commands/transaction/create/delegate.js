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
import * as transactions from '@liskhq/lisk-transactions';
import BaseCommand from '../../../base';
import { flags as commonFlags } from '../../../utils/flags';
import { getInputsFromSources } from '../../../utils/input';

const processInputs = username => ({ passphrase, secondPassphrase }) =>
	transactions.registerDelegate({
		passphrase,
		secondPassphrase,
		username,
	});

export default class DelegateCommand extends BaseCommand {
	async run() {
		const {
			args: { username },
			flags: {
				passphrase: passphraseSource,
				'second-passphrase': secondPassphraseSource,
				'no-signature': noSignature,
			},
		} = this.parse(DelegateCommand);

		const processFunction = processInputs(username);

		if (noSignature) {
			const result = processFunction({
				passphrase: null,
				secondPassphrase: null,
			});
			return this.print(result);
		}

		const inputs = await getInputsFromSources({
			passphrase: {
				source: passphraseSource,
				repeatPrompt: true,
			},
			secondPassphrase: !secondPassphraseSource
				? null
				: {
						source: secondPassphraseSource,
						repeatPrompt: true,
					},
		});
		const result = processFunction(inputs);
		return this.print(result);
	}
}

DelegateCommand.args = [
	{
		name: 'username',
		required: true,
		description: 'Username to register as a delegate.',
	},
];

DelegateCommand.flags = {
	...BaseCommand.flags,
	passphrase: flagParser.string(commonFlags.passphrase),
	'second-passphrase': flagParser.string(commonFlags.secondPassphrase),
	'no-signature': flagParser.boolean(commonFlags.noSignature),
};

DelegateCommand.description = `
Creates a transaction which will register the account as a delegate candidate if broadcast to the network.
`;

DelegateCommand.examples = ['transaction:create:delegate lightcurve'];
