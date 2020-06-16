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
	unlockToken,
	utils as transactionUtils,
} from '@liskhq/lisk-transactions';
import { isNumberString, isUInt64 } from '@liskhq/lisk-validator';
import { hexToBuffer } from '@liskhq/lisk-cryptography';
import { flags as flagParser } from '@oclif/command';

import BaseCommand from '../../../base';
import { ValidationError } from '../../../utils/error';
import { flags as commonFlags } from '../../../utils/flags';
import { getNetworkIdentifierWithInput } from '../../../utils/network_identifier';
import { getPassphraseFromPrompt } from '../../../utils/reader';

interface RawAssetUnlock {
	readonly delegateAddress: string;
	readonly amount: string;
	readonly unvoteHeight: number;
}

const createUnlockTransaction = (
	nonce: string,
	fee: string,
	networkIdentifier: string,
	unlockObjects: ReadonlyArray<RawAssetUnlock>,
	passphrase?: string,
) =>
	unlockToken({
		nonce,
		fee,
		networkIdentifier,
		passphrase,
		unlockObjects,
	});

interface Args {
	readonly nonce: string;
	readonly fee: string;
}

const splitInputs = (unlock: string) =>
	unlock
		.split(',')
		.filter(Boolean)
		.map(u => u.trim());

const validateUnlocks = (
	unlocks: ReadonlyArray<string>,
): ReadonlyArray<RawAssetUnlock> => {
	const rawAssetUnlock = [];
	for (const unlock of unlocks) {
		const [delegateAddress, amount, unvoteHeight] = splitInputs(unlock);
		if (hexToBuffer(delegateAddress).length !== 20) {
			throw new ValidationError('Enter a valid address in LSK string format.');
		}
		const normalizedAmount = transactionUtils.convertLSKToBeddows(amount);

		if (
			!isNumberString(normalizedAmount) ||
			!isUInt64(BigInt(normalizedAmount))
		) {
			throw new ValidationError(
				'Enter a valid amount in number string format.',
			);
		}

		if (!isNumberString(unvoteHeight)) {
			throw new ValidationError(
				'Enter the unvoteHeight in valid number format.',
			);
		}

		rawAssetUnlock.push({
			delegateAddress,
			amount: normalizedAmount,
			unvoteHeight: parseInt(unvoteHeight, 10),
		});
	}

	return rawAssetUnlock;
};

export default class UnlockCommand extends BaseCommand {
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
	static description = `
	Creates a transaction which will unlock tokens voted for delegates and add them back to the sender balance.
	`;

	static examples = [
		'transaction:create:unlock 1 100 --unlock="123L,1000000000,500"',
		'transaction:create:unlock 1 100 --unlock="123L,1000000000,500" --unlock="456L,1000000000,500"',
	];

	static flags = {
		...BaseCommand.flags,
		unlock: flagParser.string({ ...commonFlags.unlock, multiple: true }),
		'no-signature': flagParser.boolean(commonFlags.noSignature),
		networkIdentifier: flagParser.string(commonFlags.networkIdentifier),
		passphrase: flagParser.string(commonFlags.passphrase),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: {
				unlock: unlocks,
				networkIdentifier: networkIdentifierSource,
				passphrase: passphraseSource,
				'no-signature': noSignature,
			},
		} = this.parse(UnlockCommand);

		const { nonce, fee } = args as Args;

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

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!unlocks?.length) {
			throw new ValidationError(
				'At least one unlock object options must be provided.',
			);
		}

		const unlockObjects = validateUnlocks(unlocks);

		const networkIdentifier = getNetworkIdentifierWithInput(
			networkIdentifierSource,
			this.userConfig.api.network,
		);

		if (noSignature) {
			const noSignatureResult = createUnlockTransaction(
				nonce,
				normalizedFee,
				networkIdentifier,
				unlockObjects,
			);
			this.print(noSignatureResult);

			return;
		}

		const passphrase =
			passphraseSource ?? (await getPassphraseFromPrompt('passphrase', true));

		const result = createUnlockTransaction(
			nonce,
			normalizedFee,
			networkIdentifier,
			unlockObjects,
			passphrase,
		);
		this.print(result);
	}
}
