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
import { Transaction, testing, codec, transactions, cryptography } from 'lisk-sdk';

export const createTransferTransaction = ({
	amount,
	fee,
	recipientAddress,
	nonce,
	chainID,
}: {
	amount: string;
	fee: string;
	recipientAddress: string;
	nonce: number;
	chainID: Buffer;
}): Transaction => {
	const genesisAccount = testing.fixtures.defaultFaucetAccount;
	const encodedAsset = codec.encode(new TokenTransferAsset(BigInt(5000000)).schema, {
		recipientAddress: Buffer.from(recipientAddress, 'hex'),
		amount: BigInt(transactions.convertLSKToBeddows(amount)),
		data: '',
	});
	const tx = new Transaction({
		module: 'token',
		command: 'transfer',
		nonce: BigInt(nonce),
		senderPublicKey: genesisAccount.publicKey,
		fee: BigInt(transactions.convertLSKToBeddows(fee)),
		params: encodedAsset,
		signatures: [],
	});
	tx.signatures.push(
		cryptography.signData(
			transactions.TAG_TRANSACTION,
			chainID,
			tx.getSigningBytes(),
			genesisAccount.passphrase,
		),
	);
	return tx;
};

export const createVoteTransaction = ({
	amount,
	fee,
	recipientAddress,
	nonce,
	chainID,
}: {
	amount: string;
	fee: string;
	recipientAddress: string;
	nonce: number;
	chainID: Buffer;
}): Transaction => {
	const genesisAccount = testing.fixtures.defaultFaucetAccount;
	const encodedAsset = codec.encode(new PoSVoteAsset().schema, {
		stakes: [
			{
				validatorAddress: Buffer.from(recipientAddress, 'hex'),
				amount: BigInt(transactions.convertLSKToBeddows(amount)),
			},
		],
	});

	const tx = new Transaction({
		moduleID: utils.intToBuffer(5, 4),
		commandID: utils.intToBuffer(1, 4),
		nonce: BigInt(nonce),
		senderPublicKey: genesisAccount.publicKey,
		fee: BigInt(transactions.convertLSKToBeddows(fee)),
		params: encodedAsset,
		signatures: [],
	});
	tx.signatures.push(
		cryptography.signData(
			transactions.TAG_TRANSACTION,
			chainID,
			tx.getSigningBytes(),
			genesisAccount.passphrase,
		),
	);
	return tx;
};
