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
import { registerDelegate } from '@liskhq/lisk-transactions';
import { flags as flagParser } from '@oclif/command';

import BaseCommand from '../../../base';
import { flags as commonFlags } from '../../../utils/flags';
import {
	getInputsFromSources,
	InputFromSourceOutput,
} from '../../../utils/input';
import { getNetworkIdentifierWithInput } from '../../../utils/network_identifier';

interface Args {
	readonly username: string;
}

const processInputs = (networkIdentifier: string, username: string) => ({
	passphrase,
	secondPassphrase,
}: InputFromSourceOutput) =>
	registerDelegate({
		networkIdentifier,
		passphrase,
		secondPassphrase,
		username,
	});

export default class DelegateCommand extends BaseCommand {
	static args = [
		{
			name: 'username',
			required: true,
			description: 'Username to register as a delegate.',
		},
	];

	static description = `
	Creates a transaction which will register the account as a delegate candidate if broadcast to the network.
	`;

	static examples = ['transaction:create:delegate lightcurve'];

	static flags = {
		...BaseCommand.flags,
		networkIdentifier: flagParser.string(commonFlags.networkIdentifier),
		passphrase: flagParser.string(commonFlags.passphrase),
		'second-passphrase': flagParser.string(commonFlags.secondPassphrase),
		'no-signature': flagParser.boolean(commonFlags.noSignature),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: {
				networkIdentifier: networkIdentifierSource,
				passphrase: passphraseSource,
				'second-passphrase': secondPassphraseSource,
				'no-signature': noSignature,
			},
		} = this.parse(DelegateCommand);

		const { username }: Args = args;
		const networkIdentifier = getNetworkIdentifierWithInput(
			networkIdentifierSource,
			this.userConfig.api.network,
		);
		const processFunction = processInputs(networkIdentifier, username);

		if (noSignature) {
			const noSignatureResult = processFunction({
				passphrase: undefined,
				secondPassphrase: undefined,
			});
			this.print(noSignatureResult);

			return;
		}

		const inputs = await getInputsFromSources({
			passphrase: {
				source: passphraseSource,
				repeatPrompt: true,
			},
			secondPassphrase: !secondPassphraseSource
				? undefined
				: {
						source: secondPassphraseSource,
						repeatPrompt: true,
				  },
		});
		const result = processFunction(inputs);
		this.print(result);
	}
}
