/*
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
 */

import { TransferTransaction, VoteTransaction, utils } from '@liskhq/lisk-transactions';
import * as genesisDelegates from '../fixtures/genesis_delegates.json';
import { networkIdentifier } from '../fixtures/devnet';

const { convertLSKToBeddows } = utils;

export const createTransferTransaction = ({
	amount,
	fee,
	recipientAddress,
	nonce,
}: {
	amount: string;
	fee: string;
	recipientAddress: string;
	nonce: number;
}) => {
	const genesisAccount = genesisDelegates.accounts[0];
	const transaction = new TransferTransaction({
		nonce: BigInt(nonce),
		fee: BigInt(convertLSKToBeddows(fee)),
		senderPublicKey: Buffer.from(genesisAccount.publicKey, 'base64'),
		asset: {
			amount: BigInt(convertLSKToBeddows(amount)),
			recipientAddress: Buffer.from(recipientAddress, 'base64'),
			data: '',
		},
	});

	transaction.sign(networkIdentifier, genesisAccount.passphrase);

	return transaction;
};

export const createVoteTransaction = ({
	amount,
	fee,
	recipientAddress,
	nonce,
}: {
	amount: string;
	fee: string;
	recipientAddress: string;
	nonce: number;
}) => {
	const genesisAccount = genesisDelegates.accounts[0];
	const transaction = new VoteTransaction({
		nonce: BigInt(nonce),
		fee: BigInt(convertLSKToBeddows(fee)),
		senderPublicKey: Buffer.from(genesisAccount.publicKey, 'base64'),
		asset: {
			votes: [
				{
					delegateAddress: Buffer.from(recipientAddress, 'base64'),
					amount: BigInt(convertLSKToBeddows(amount)),
				},
			],
		},
	});

	transaction.sign(networkIdentifier, genesisAccount.passphrase);

	return transaction;
};
