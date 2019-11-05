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
import { transfer, utils as transactionUtils } from '@liskhq/lisk-transactions';
import { flags as flagParser } from '@oclif/command';
import BaseCommand from '../../../base';
import { AlphabetLowercase, flags as commonFlags } from '../../../utils/flags';
import {
	getInputsFromSources,
	InputFromSourceOutput,
} from '../../../utils/input';
import { getNetworkIdentifierWithInput } from '../../../utils/network_identifier';

interface Args {
	readonly address: string;
	readonly amount: string;
}

const dataFlag = {
	char: 'd' as AlphabetLowercase,
	description: `Optional UTF8 encoded data (maximum of 64 bytes) to include in the transaction asset.
	Examples:
	- --data=customInformation
`,
};

const processInputs = (
	networkIdentifier: string,
	amount: string,
	address: string,
	data?: string,
) => ({ passphrase, secondPassphrase }: InputFromSourceOutput) =>
	transfer({
		networkIdentifier,
		recipientId: address,
		amount,
		data,
		passphrase,
		secondPassphrase,
	});

export default class TransferCommand extends BaseCommand {
	static args = [
		{
			name: 'amount',
			required: true,
			description: 'Amount of LSK to send.',
		},
		{
			name: 'address',
			required: true,
			description: 'Address of the recipient.',
		},
	];

	static description = `
	Creates a transaction which will transfer the specified amount to an address if broadcast to the network.
		`;

	static examples = ['transaction:create:transfer 100 13356260975429434553L'];

	static flags = {
		...BaseCommand.flags,
		networkIdentifier: flagParser.string(commonFlags.networkIdentifier),
		passphrase: flagParser.string(commonFlags.passphrase),
		'second-passphrase': flagParser.string(commonFlags.secondPassphrase),
		'no-signature': flagParser.boolean(commonFlags.noSignature),
		data: flagParser.string(dataFlag),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: {
				networkIdentifier: networkIdentifierSource,
				passphrase: passphraseSource,
				'second-passphrase': secondPassphraseSource,
				'no-signature': noSignature,
				data: dataString,
			},
		} = this.parse(TransferCommand);

		const { amount, address }: Args = args;
		const networkIdentifier = getNetworkIdentifierWithInput(
			networkIdentifierSource,
			this.userConfig.api.network,
		);

		transactionUtils.validateAddress(address);
		const normalizedAmount = transactionUtils.convertLSKToBeddows(amount);

		const processFunction = processInputs(
			networkIdentifier,
			normalizedAmount,
			address,
			dataString,
		);

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
