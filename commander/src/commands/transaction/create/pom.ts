/*
 * LiskHQ/lisk-commander
 * Copyright © 2020 Lisk Foundation
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
	reportMisbehavior,
	utils as transactionUtils,
} from '@liskhq/lisk-transactions';
import { isNumberString, isUInt64 } from '@liskhq/lisk-validator';
import { flags as flagParser } from '@oclif/command';

import BaseCommand from '../../../base';
import { ValidationError } from '../../../utils/error';
import { flags as commonFlags } from '../../../utils/flags';
import { getNetworkIdentifierWithInput } from '../../../utils/network_identifier';
import { getPassphraseFromPrompt } from '../../../utils/reader';

interface RawHeader {
	readonly id: string;
	readonly version: number;
	readonly timestamp: number;
	readonly height: number;
	readonly previousBlockID: string;
	readonly transactionRoot: string;
	readonly generatorPublicKey: string;
	readonly reward: string;
	readonly signature: string;
	readonly asset: {
		readonly seedReveal: string;
		readonly maxHeightPreviouslyForged: number;
		readonly maxHeightPrevoted: number;
	};
}

const processInputs = (
	nonce: string,
	fee: string,
	networkIdentifier: string,
	header1: RawHeader,
	header2: RawHeader,
	passphrase?: string,
) =>
	reportMisbehavior({
		nonce,
		fee,
		networkIdentifier,
		passphrase,
		header1,
		header2,
	});

interface Args {
	readonly nonce: string;
	readonly fee: string;
	readonly header1: string;
	readonly header2: string;
}

export default class PoMCommand extends BaseCommand {
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
			name: 'header1',
			required: true,
			description: 'Contradicting block header as JSON string.',
		},
		{
			name: 'header2',
			required: true,
			description: 'Contradicting block header as JSON string.',
		},
	];
	static description = `
	Creates a transaction which will report misbehavior of delegate by providing 2 contradicting block headers.
	`;

	static examples = [
		'transaction:create:pom 1 100 "{"height": 3, "version": 2, "maxHeightPrevoted": 30, "blockSignature": "xxx"}" "{"height": 3, "version": 2, "maxHeightPrevoted": 31, "blockSignature": "yyy"}"',
	];

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
		} = this.parse(PoMCommand);

		const {
			nonce,
			fee,
			header1: header1Str,
			header2: header2Str,
		} = args as Args;

		if (!isNumberString(nonce) || !isUInt64(BigInt(nonce))) {
			throw new ValidationError('Enter a valid nonce in number string format.');
		}

		if (Number.isNaN(Number(fee))) {
			throw new ValidationError('Enter a valid fee in number string format.');
		}

		const normalizedFee = transactionUtils.convertLSKToBeddows(fee);

		if (!isNumberString(normalizedFee) || !isUInt64(BigInt(normalizedFee))) {
			throw new ValidationError('Enter a valid fee in number string format.');
		}

		let header1: RawHeader;
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			header1 = JSON.parse(header1Str);
		} catch (error) {
			throw new Error(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/restrict-template-expressions
				`Invalid block header 1. Fail to parse the input. ${error.message}`,
			);
		}

		let header2: RawHeader;
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			header2 = JSON.parse(header2Str);
		} catch (error) {
			throw new Error(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/restrict-template-expressions
				`Invalid block header 1. Fail to parse the input. ${error.message}`,
			);
		}

		const networkIdentifier = getNetworkIdentifierWithInput(
			networkIdentifierSource,
			this.userConfig.api.network,
		);

		if (noSignature) {
			const noSignatureResult = processInputs(
				nonce,
				normalizedFee,
				networkIdentifier,
				header1,
				header2,
			);
			this.print(noSignatureResult);

			return;
		}

		const passphrase =
			passphraseSource ?? (await getPassphraseFromPrompt('passphrase', true));

		const result = processInputs(
			nonce,
			normalizedFee,
			networkIdentifier,
			header1,
			header2,
			passphrase,
		);
		this.print(result);
	}
}
