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
import { flags as flagParser } from '@oclif/command';

import BaseCommand from '../../base';
import { ValidationError } from '../../utils/error';
import { flags as commonFlags } from '../../utils/flags';
import { getStdIn } from '../../utils/input/utils';
import { getNetworkIdentifierWithInput } from '../../utils/network_identifier';
import {
	instantiateTransaction,
	parseTransactionString,
} from '../../utils/transactions';

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

export default class VerifyCommand extends BaseCommand {
	static args = [
		{
			name: 'transaction',
			description: 'Transaction to verify in JSON format.',
		},
	];

	static description = `
	Verifies a transaction has a valid signature.
	`;

	static examples = ['transaction:verify \'{"type":0,"amount":"100",...}\''];

	static flags = {
		...BaseCommand.flags,
		networkIdentifier: flagParser.string(commonFlags.passphrase),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: { networkIdentifier: networkIdentifierSource },
		} = this.parse(VerifyCommand);

		const { transaction }: Args = args;
		const transactionInput = transaction || (await getTransactionInput());
		const transactionObject = parseTransactionString(transactionInput);

		const {
			signSignature,
			...transactionObjectWithoutSignSignature
		} = transactionObject;

		const networkIdentifier = getNetworkIdentifierWithInput(
			networkIdentifierSource,
			this.userConfig.api.network,
		);

		const txInstance = instantiateTransaction({
			...transactionObjectWithoutSignSignature,
			networkIdentifier,
		});

		const { errors } = txInstance.validate();
		this.print({
			verified: errors.length === 0,
		});
	}
}
