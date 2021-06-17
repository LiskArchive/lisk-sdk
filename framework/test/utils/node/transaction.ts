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
 *
 */

import { Transaction, BlockHeader, TAG_TRANSACTION } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { getAddressAndPublicKeyFromPassphrase, signData } from '@liskhq/lisk-cryptography';
import { signMultiSignatureTransaction } from '@liskhq/lisk-transactions';
import { TransferAsset } from '../../../src/modules/token/transfer_asset';
import { RegisterTransactionAsset } from '../../../src/modules/dpos/transaction_assets/register_transaction_asset';
import { RegisterAsset as MultisignatureRegisterAsset } from '../../../src/modules/keys/register_asset';
import { VoteTransactionAsset } from '../../../src/modules/dpos/transaction_assets/vote_transaction_asset';
import { PomTransactionAsset } from '../../../src/modules/dpos';

export const createTransferTransaction = (input: {
	recipientAddress: Buffer;
	amount?: bigint;
	nonce: bigint;
	networkIdentifier: Buffer;
	passphrase: string;
	fee?: bigint;
}): Transaction => {
	const encodedAsset = codec.encode(new TransferAsset(BigInt(5000000)).schema, {
		recipientAddress: input.recipientAddress,
		amount: input.amount ?? BigInt('10000000000'),
		data: '',
	});
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(input.passphrase);

	const tx = new Transaction({
		moduleID: 2,
		assetID: 0,
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee ?? BigInt('200000'),
		asset: encodedAsset,
		signatures: [],
	});
	(tx.signatures as Buffer[]).push(
		signData(TAG_TRANSACTION, input.networkIdentifier, tx.getSigningBytes(), input.passphrase),
	);
	return tx;
};

export const createDelegateRegisterTransaction = (input: {
	nonce: bigint;
	networkIdentifier: Buffer;
	passphrase: string;
	username: string;
	fee?: bigint;
}): Transaction => {
	const encodedAsset = codec.encode(new RegisterTransactionAsset().schema, {
		username: input.username,
	});
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(input.passphrase);

	const tx = new Transaction({
		moduleID: 5,
		assetID: 0,
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee ?? BigInt('2500000000'),
		asset: encodedAsset,
		signatures: [],
	});
	(tx.signatures as Buffer[]).push(
		signData(TAG_TRANSACTION, input.networkIdentifier, tx.getSigningBytes(), input.passphrase),
	);
	return tx;
};

export const createDelegateVoteTransaction = (input: {
	nonce: bigint;
	networkIdentifier: Buffer;
	passphrase: string;
	fee?: bigint;
	votes: { delegateAddress: Buffer; amount: bigint }[];
}): Transaction => {
	const encodedAsset = codec.encode(new VoteTransactionAsset().schema, {
		votes: input.votes,
	});
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(input.passphrase);

	const tx = new Transaction({
		moduleID: 5,
		assetID: 1,
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee ?? BigInt('100000000'),
		asset: encodedAsset,
		signatures: [],
	});
	(tx.signatures as Buffer[]).push(
		signData(TAG_TRANSACTION, input.networkIdentifier, tx.getSigningBytes(), input.passphrase),
	);
	return tx;
};

export const createMultiSignRegisterTransaction = (input: {
	nonce: bigint;
	networkIdentifier: Buffer;
	fee?: bigint;
	mandatoryKeys: Buffer[];
	optionalKeys: Buffer[];
	numberOfSignatures: number;
	senderPassphrase: string;
	passphrases: string[];
}): Transaction => {
	const encodedAsset = codec.encode(new MultisignatureRegisterAsset().schema, {
		mandatoryKeys: input.mandatoryKeys,
		optionalKeys: input.optionalKeys,
		numberOfSignatures: input.numberOfSignatures,
	});
	const { schema } = new MultisignatureRegisterAsset();
	const asset = {
		mandatoryKeys: input.mandatoryKeys,
		optionalKeys: input.optionalKeys,
		numberOfSignatures: input.numberOfSignatures,
	};
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(input.senderPassphrase);
	const transaction = [input.senderPassphrase, ...input.passphrases].reduce<
		Record<string, unknown>
	>(
		(prev, current) => {
			return signMultiSignatureTransaction(
				schema,
				prev,
				input.networkIdentifier,
				current,
				asset,
				true,
			);
		},
		{
			moduleID: 4,
			assetID: 0,
			nonce: input.nonce,
			senderPublicKey: publicKey,
			fee: input.fee ?? BigInt('1100000000'),
			asset,
			signatures: [],
		},
	);

	const tx = new Transaction({ ...transaction, asset: encodedAsset } as any);
	return tx;
};

export const createMultisignatureTransferTransaction = (input: {
	nonce: bigint;
	networkIdentifier: Buffer;
	recipientAddress: Buffer;
	amount: bigint;
	fee?: bigint;
	mandatoryKeys: Buffer[];
	optionalKeys: Buffer[];
	senderPublicKey: Buffer;
	passphrases: string[];
}): Transaction => {
	const { schema } = new TransferAsset(BigInt(5000000));
	const asset = {
		recipientAddress: input.recipientAddress,
		amount: BigInt('10000000000'),
		data: '',
	};
	const encodedAsset = codec.encode(schema, asset);
	const transaction = input.passphrases.reduce<Record<string, unknown>>(
		(prev, current) => {
			return signMultiSignatureTransaction(schema, prev, input.networkIdentifier, current, {
				mandatoryKeys: input.mandatoryKeys,
				optionalKeys: input.optionalKeys,
			});
		},
		{
			moduleID: 2,
			assetID: 0,
			nonce: input.nonce,
			senderPublicKey: input.senderPublicKey,
			fee: input.fee ?? BigInt('1100000000'),
			asset,
			signatures: [],
		},
	);

	const tx = new Transaction({ ...transaction, asset: encodedAsset } as any);
	return tx;
};

export const createReportMisbehaviorTransaction = (input: {
	nonce: bigint;
	networkIdentifier: Buffer;
	passphrase: string;
	header1: BlockHeader;
	header2: BlockHeader;
	fee?: bigint;
}): Transaction => {
	const encodedAsset = codec.encode(new PomTransactionAsset().schema, {
		header1: input.header1,
		header2: input.header2,
	});
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(input.passphrase);

	const tx = new Transaction({
		moduleID: 5,
		assetID: 3,
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee ?? BigInt('50000000'),
		asset: encodedAsset,
		signatures: [],
	});
	(tx.signatures as Buffer[]).push(
		signData(TAG_TRANSACTION, input.networkIdentifier, tx.getSigningBytes(), input.passphrase),
	);
	return tx;
};
