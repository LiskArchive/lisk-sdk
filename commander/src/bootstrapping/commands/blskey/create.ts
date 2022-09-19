/*
 * LiskHQ/lisk-commander
 * Copyright © 2022 Lisk Foundation
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

import * as cryptography from '@liskhq/lisk-cryptography';
import { Command } from '@oclif/core';
import { flagsWithParser } from '../../../utils/flags';
import { getPassphraseFromPrompt } from '../../../utils/reader';

interface BlsKey {
	readonly blsPrivateKey: string;
	readonly blsPublicKey: string;
}

const createBlsKey = (passphrase: string): BlsKey => {
	const blsPrivateKey = cryptography.bls.generatePrivateKey(Buffer.from(passphrase, 'utf-8'));
	const blsPublicKey = cryptography.bls.getPublicKeyFromPrivateKey(blsPrivateKey);

	return {
		blsPrivateKey: blsPrivateKey.toString('hex'),
		blsPublicKey: blsPublicKey.toString('hex'),
	};
};

export class CreateCommand extends Command {
	static description = 'Return bls public & private keys corresponding to the given passphrase.';

	static examples = [
		'blskey:create',
		'blskey:create --passphrase your-passphrase',
		'blskey:create --passphrase your-passphrase --pretty',
	];

	static flags = {
		passphrase: flagsWithParser.passphrase,
		pretty: flagsWithParser.pretty,
	};

	async run(): Promise<void> {
		const {
			flags: { passphrase: passphraseSource, pretty },
		} = await this.parse(CreateCommand);
		const passphrase = passphraseSource ?? (await getPassphraseFromPrompt('passphrase', true));
		const blsKeys = createBlsKey(passphrase);
		this.printJSON(blsKeys, pretty);
	}

	public printJSON(message?: object, pretty = false): void {
		if (pretty) {
			this.log(JSON.stringify(message, undefined, '  '));
		} else {
			this.log(JSON.stringify(message));
		}
	}
}
