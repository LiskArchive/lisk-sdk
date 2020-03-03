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
	registerDelegate,
	utils as transactionUtils,
} from '@liskhq/lisk-transactions';
import { isValidFee, isValidNonce } from '@liskhq/lisk-validator';
import { flags as flagParser } from '@oclif/command';

import BaseCommand from '../../../base';
import { ValidationError } from '../../../utils/error';
import { flags as commonFlags } from '../../../utils/flags';
import {
	getInputsFromSources,
	InputFromSourceOutput,
} from '../../../utils/input';
import { getNetworkIdentifierWithInput } from '../../../utils/network_identifier';

interface Args {
	readonly nonce: string;
	readonly fee: string;
	readonly username: string;
}

const processInputs = (
	nonce: string,
	fee: string,
	networkIdentifier: string,
	username: string,
) => ({ passphrase }: InputFromSourceOutput) =>
	registerDelegate({
		nonce,
		fee,
		networkIdentifier,
		passphrase,
		username,
	});

export default class DelegateCommand extends BaseCommand {
	static args = [
		{
			name: 'nonce',
			required: true,
			description: 'Nonce of the transaction.',
		},
		{
			name: 'fee',
			required: true,
			description: 'Transaction fee in LSK.',
		},
		{
			name: 'username',
			required: true,
			description: 'Username to register as a delegate.',
		},
	];

	static description = `
	Creates a transaction which will register the account as a delegate candidate if broadcast to the network.
	`;

	static examples = ['transaction:create:delegate 1 100 lightcurve'];

	static flags = {
		...BaseCommand.flags,
		networkIdentifier: flagParser.string(commonFlags.networkIdentifier),
		passphrase: flagParser.string(commonFlags.passphrase),
		'no-signature': flagParser.boolean(commonFlags.noSignature),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: {
				networkIdentifier: networkIdentifierSource,
				passphrase: passphraseSource,
				'no-signature': noSignature,
			},
		} = this.parse(DelegateCommand);

		const { nonce, fee, username }: Args = args;
		const networkIdentifier = getNetworkIdentifierWithInput(
			networkIdentifierSource,
			this.userConfig.api.network,
		);

		if (!isValidNonce(nonce)) {
			throw new ValidationError('Enter a valid nonce in number string format.');
		}

		if (Number.isNaN(Number(fee))) {
			throw new ValidationError('Enter a valid fee in number string format.');
		}

		const normalizedFee = transactionUtils.convertLSKToBeddows(fee);

		if (!isValidFee(normalizedFee)) {
			throw new ValidationError('Enter a valid fee in number string format.');
		}

		const processFunction = processInputs(
			nonce,
			normalizedFee,
			networkIdentifier,
			username,
		);

		if (noSignature) {
			const noSignatureResult = processFunction({
				passphrase: undefined,
			});
			this.print(noSignatureResult);

			return;
		}

		const inputs = await getInputsFromSources({
			passphrase: {
				source: passphraseSource,
				repeatPrompt: true,
			},
		});
		const result = processFunction(inputs);
		this.print(result);
	}
}
