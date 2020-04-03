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
	TransactionJSON,
	utils as transactionUtils,
} from '@liskhq/lisk-transactions';
import { isValidFee, isValidNonce } from '@liskhq/lisk-validator';
import { flags as flagParser } from '@oclif/command';

import BaseCommand from '../../../base';
import { ValidationError } from '../../../utils/error';
import { flags as commonFlags } from '../../../utils/flags';
import { getNetworkIdentifierWithInput } from '../../../utils/network_identifier';
import { getPassphraseFromPrompt } from '../../../utils/reader';

interface PomInput {
	readonly nonce: string;
	readonly fee: string;
	readonly networkIdentifier: string;
	readonly header1: RawHeader;
	readonly header2: RawHeader;
	readonly passphrase?: string;
}

const reportMisbehavior = ({
	nonce,
	fee,
	networkIdentifier,
	header1,
	header2,
	passphrase,
}: PomInput): Partial<TransactionJSON> => {
	// tslint:disable-next-line no-console
	console.log({
		nonce,
		fee,
		networkIdentifier,
		header1,
		header2,
		passphrase,
	});

	// tslint:disable-next-line
	return {} as Partial<TransactionJSON>;
};

interface RawHeader {
	readonly id: string;
	readonly height: number;
	readonly version: number;
	readonly timestamp: number;
	readonly previousBlockId?: string | null;
	readonly blockSignature: string;
	readonly seedReveal: string;
	readonly generatorPublicKey: string;
	readonly numberOfTransactions: number;
	readonly payloadLength: number;
	readonly payloadHash: string;
	readonly totalAmount: string;
	readonly totalFee: string;
	readonly reward: string;
	readonly maxHeightPreviouslyForged: number;
	readonly maxHeightPrevoted: number;
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

		// tslint:disable-next-line no-let
		let header1: RawHeader;
		try {
			header1 = JSON.parse(header1Str);
		} catch (error) {
			throw new Error(
				`Invalid block header 1. Fail to parse the input. ${error.message}`,
			);
		}

		// tslint:disable-next-line no-let
		let header2: RawHeader;
		try {
			header2 = JSON.parse(header2Str);
		} catch (error) {
			throw new Error(
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
