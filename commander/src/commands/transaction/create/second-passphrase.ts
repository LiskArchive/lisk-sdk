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
import { registerSecondPassphrase } from '@liskhq/lisk-transactions';
import { flags as flagParser } from '@oclif/command';
import BaseCommand from '../../../base';
import { ValidationError } from '../../../utils/error';
import { flags as commonFlags } from '../../../utils/flags';
import {
	getInputsFromSources,
	InputFromSourceOutput,
} from '../../../utils/input';

export const processInputs = () => ({
	passphrase,
	secondPassphrase,
}: InputFromSourceOutput) => {
	if (!secondPassphrase) {
		throw new ValidationError('No second passphrase was provided.');
	}

	return registerSecondPassphrase({
		passphrase,
		secondPassphrase,
	});
};

export default class SecondPassphraseCommand extends BaseCommand {
	static description = `
	Creates a transaction which will register a second passphrase for the account if broadcast to the network.
	`;

	static examples = ['transaction:create:second-passphrase'];

	static flags = {
		...BaseCommand.flags,
		passphrase: flagParser.string(commonFlags.passphrase),
		'second-passphrase': flagParser.string(commonFlags.secondPassphrase),
		'no-signature': flagParser.boolean(commonFlags.noSignature),
	};

	async run(): Promise<void> {
		const {
			flags: {
				passphrase: passphraseSource,
				'second-passphrase': secondPassphraseSource,
				'no-signature': noSignature,
			},
		} = this.parse(SecondPassphraseCommand);

		const processFunction = processInputs();

		const inputs = noSignature
			? await getInputsFromSources({
					passphrase: undefined,
					secondPassphrase: {
						source: secondPassphraseSource,
						repeatPrompt: true,
					},
			  })
			: await getInputsFromSources({
					passphrase: {
						source: passphraseSource,
						repeatPrompt: true,
					},
					secondPassphrase: {
						source: secondPassphraseSource,
						repeatPrompt: true,
					},
			  });
		const result = processFunction(inputs);
		this.print(result);
	}
}
