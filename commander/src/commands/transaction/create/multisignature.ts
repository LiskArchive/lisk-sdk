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
	registerMultisignature,
	utils as transactionUtils,
} from '@liskhq/lisk-transactions';
import { isValidFee, isValidNonce } from '@liskhq/lisk-validator';
import { flags as flagParser } from '@oclif/command';

import BaseCommand from '../../../base';
import { ValidationError } from '../../../utils/error';
import { flags as commonFlags } from '../../../utils/flags';
import { getNetworkIdentifierWithInput } from '../../../utils/network_identifier';
import { getPassphraseFromPrompt } from '../../../utils/reader';

export default class MultisignatureCommand extends BaseCommand {
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
	];

	static flags = {
		...BaseCommand.flags,
		networkIdentifier: flagParser.string(commonFlags.networkIdentifier),
		passphrase: flagParser.string(commonFlags.passphrase),
		'number-of-signatures': flagParser.integer({
			description:
				'Number of signatures required to validate transactions from that account',
		}),
		'mandatory-key': flagParser.string({
			multiple: true,
			description: 'Mandatory public key for multisignature account.',
		}),
		'optional-key': flagParser.string({
			multiple: true,
			description: 'Optional public key for multisignature account.',
		}),
		'member-passphrase': flagParser.string({
			multiple: true,
			description:
				'Number of signatures required to validate transactions from that account. Its a less secure way to sign transaction. See command description for details. ',
		}),
	};

	static description = `
	Creates a transaction which will register the account as a multisignature account if broadcast to the network, using the following arguments:

		1. Mandatory keys to verify signatures for the multisignature account. Signatures for these kes must exists to verify every transaction from that account.
		2. Optional keys to verify signatures for the multisignature account. Signatures for these kes can or can't exists to verify transaction from that account.
		3. Number of signatures required for a transaction from the account to be valid. These value must be minimum of count of mandatory keys.
		4. Member passphrases for every mandatory and optional key provided.

	Use of '--member-passphrase' flag is not encourage for better security practices. This will expose the passphrase to command line and may end up logging into system logs. Use 'transaction:sign' command to sign with member passphrases.
	`;

	static examples = [
		'transaction:create:multisignature 1 100 --mandatory-key="xxx" ' +
			'--mandatory-key="yyy" --optional-key="yyy" --optional-key="yyy" ' +
			'--number-of-signatures=4 --passphrase="****" ' +
			'--member-passphrase="****" --member-passphrase="****" ',
	];

	async run(): Promise<void> {
		const {
			args: { fee: feeSource, nonce },
			flags: {
				networkIdentifier: networkIdentifierSource,
				passphrase: passphraseSource,
				'member-passphrase': memberPassphrasesSource,
				'optional-key': optionalKeysSource,
				'mandatory-key': mandatoryKeysSource,
				'number-of-signatures': numberOfSignaturesSource,
			},
		} = this.parse(MultisignatureCommand);

		const numberOfSignatures = numberOfSignaturesSource || 0;
		const mandatoryKeys = mandatoryKeysSource || [];
		const optionalKeys = optionalKeysSource || [];
		const memberPassphrases = memberPassphrasesSource || [];

		const networkIdentifier = getNetworkIdentifierWithInput(
			networkIdentifierSource,
			this.userConfig.api.network,
		);

		if (!isValidNonce(nonce)) {
			throw new ValidationError('Enter a valid nonce in number string format.');
		}

		if (Number.isNaN(Number(feeSource))) {
			throw new ValidationError('Enter a valid fee in number string format.');
		}

		const fee = transactionUtils.convertLSKToBeddows(feeSource);

		if (!isValidFee(fee)) {
			throw new ValidationError('Enter a valid fee in number string format.');
		}

		const senderPassphrase =
			passphraseSource ?? (await getPassphraseFromPrompt('passphrase', true));

		const result = registerMultisignature({
			senderPassphrase,
			passphrases: memberPassphrases || [],
			mandatoryKeys: mandatoryKeys || [],
			optionalKeys: optionalKeys || [],
			numberOfSignatures: numberOfSignatures || 0,
			networkIdentifier,
			nonce,
			fee,
		});
		this.print(result);
	}
}
