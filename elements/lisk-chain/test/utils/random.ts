/*
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
 */

import * as randomstring from 'randomstring';
import {
	getKeys,
	getAddressFromPassphrase,
	getNetworkIdentifier,
} from '@liskhq/lisk-cryptography';
import { transfer, TransactionJSON } from '@liskhq/lisk-transactions';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import * as genesisBlock from '../fixtures/genesis_block.json';
import { genesisAccount } from '../fixtures/default_account';

const networkIdentifier = getNetworkIdentifier(
	genesisBlock.payloadHash,
	'Lisk',
);

const delegateName = () => {
	const randomLetter = randomstring.generate({
		length: 1,
		charset: 'alphabetic',
		capitalization: 'lowercase',
	});
	const custom = 'abcdefghijklmnopqrstuvwxyz0123456789!@$&_.';
	const username = randomstring.generate({
		length: 19,
		charset: custom,
	});

	return randomLetter.concat(username);
};

export const account = (balance = '0', nonDelegate = false) => {
	const passphrase = Mnemonic.generateMnemonic();
	const secondPassphrase = Mnemonic.generateMnemonic();
	return {
		balance,
		passphrase,
		keypair: getKeys(passphrase),
		secondPassphrase,
		username: nonDelegate ? '' : delegateName(),
		publicKey: getKeys(passphrase).publicKey,
		address: getAddressFromPassphrase(passphrase),
		secondPublicKey: getKeys(secondPassphrase).publicKey,
	};
};

export const transaction = (offset?: number): TransactionJSON =>
	transfer({
		networkIdentifier,
		amount: '1',
		passphrase: genesisAccount.passphrase,
		recipientId: account().address,
		timeOffset: offset,
	}) as TransactionJSON;

export const transferInstance = (offset?: number) => {
	const tx = transaction(offset);
	return {
		...tx,
		fee: BigInt((tx as any).fee),
		asset: {
			...tx.asset,
			amount: BigInt((tx as any).asset.amount),
		},
	};
};
