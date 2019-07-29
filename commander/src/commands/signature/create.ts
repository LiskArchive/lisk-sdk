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
import * as transactions from '@liskhq/lisk-transactions';
import { flags as flagParser } from '@oclif/command';
import BaseCommand from '../../base';
import { ValidationError } from '../../utils/error';
import { flags as commonFlags } from '../../utils/flags';
import { getInputsFromSources } from '../../utils/input';
import { getStdIn } from '../../utils/input/utils';
import { parseTransactionString } from '../../utils/transactions';

interface Args {
	readonly transaction?: string;
}

const getTransactionInput = async (): Promise<string> => {
	try {
		const { data } = await getStdIn({ dataIsRequired: true });
		if (!data) {
			throw new ValidationError('No transaction was provided.');
		}

		return data;
	} catch (e) {
		throw new ValidationError('No transaction was provided.');
	}
};

export default class CreateCommand extends BaseCommand {
	static args = [
		{
			name: 'transaction',
			description: 'Transaction in JSON format.',
		},
	];

	static description = `
	Create a signature object for a transaction from a multisignature account.
	Accepts a stringified JSON transaction as an argument.
	`;

	static examples = [
		'signature:create \'{"amount":"10","recipientId":"8050281191221330746L","senderPublicKey":"3358a1562f9babd523a768e700bb12ad58f230f84031055802dc0ea58cef1e1b","timestamp":59353522,"type":0,"asset":{},"signature":"b84b95087c381ad25b5701096e2d9366ffd04037dcc941cd0747bfb0cf93111834a6c662f149018be4587e6fc4c9f5ba47aa5bbbd3dd836988f153aa8258e604"}\'',
	];

	static flags = {
		...BaseCommand.flags,
		passphrase: flagParser.string(commonFlags.passphrase),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: { passphrase: passphraseSource },
		} = this.parse(CreateCommand);

		const { transaction }: Args = args;
		const transactionInput = transaction || (await getTransactionInput());

		const transactionObject = parseTransactionString(transactionInput);

		const { valid } = transactions.utils.validateTransaction(transactionObject);
		if (!valid) {
			throw new Error('Provided transaction is invalid.');
		}

		const { passphrase } = await getInputsFromSources({
			passphrase: {
				source: passphraseSource,
				repeatPrompt: true,
			},
		});

		if (!passphrase) {
			throw new ValidationError('No passphrase was provided.');
		}

		const result = transactions.createSignatureObject(
			transactionObject,
			passphrase,
		);

		this.print(result);
	}
}
