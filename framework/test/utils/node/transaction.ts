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
import {
	getAddressAndPublicKeyFromPassphrase,
	signData,
	generatePrivateKey,
	getPublicKeyFromPrivateKey,
	blsPopProve,
} from '@liskhq/lisk-cryptography';
import { signMultiSignatureTransaction } from '@liskhq/lisk-transactions';
import { registerMultisignatureParamsSchema } from '../../../src/modules/auth/schemas';
import {
	delegateRegistrationCommandParamsSchema,
	pomCommandParamsSchema,
	voteCommandParamsSchema,
} from '../../../src/modules/dpos_v2/schemas';
import { TransferCommand } from '../../../src/modules/token/commands/transfer';
import { MODULE_ID_TOKEN } from '../../../src/modules/token/constants';
import { transferParamsSchema } from '../../../src/modules/token/schemas';

export const DEFAULT_TOKEN_ID = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);

export const createTransferTransaction = (input: {
	recipientAddress: Buffer;
	amount?: bigint;
	nonce: bigint;
	networkIdentifier: Buffer;
	passphrase: string;
	fee?: bigint;
}): Transaction => {
	const encodedParams = codec.encode(transferParamsSchema, {
		tokenID: DEFAULT_TOKEN_ID,
		recipientAddress: input.recipientAddress,
		amount: input.amount ?? BigInt('10000000000'),
		data: '',
	});
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(input.passphrase);

	const tx = new Transaction({
		moduleID: 2,
		commandID: 0,
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee ?? BigInt('200000'),
		params: encodedParams,
		signatures: [],
	});
	tx.signatures.push(
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
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(input.passphrase);
	const blsSK = generatePrivateKey(Buffer.from(input.passphrase, 'utf-8'));
	const blsPK = getPublicKeyFromPrivateKey(blsSK);
	const blsPop = blsPopProve(blsSK);
	const encodedAsset = codec.encode(delegateRegistrationCommandParamsSchema, {
		name: input.username,
		generatorKey: publicKey,
		blsKey: blsPK,
		proofOfPossession: blsPop,
	});

	const tx = new Transaction({
		moduleID: 13,
		commandID: 0,
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee ?? BigInt('2500000000'),
		params: encodedAsset,
		signatures: [],
	});
	tx.signatures.push(
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
	const encodedAsset = codec.encode(voteCommandParamsSchema, {
		votes: input.votes,
	});
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(input.passphrase);

	const tx = new Transaction({
		moduleID: 13,
		commandID: 1,
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee ?? BigInt('100000000'),
		params: encodedAsset,
		signatures: [],
	});
	tx.signatures.push(
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
	const encodedAsset = codec.encode(registerMultisignatureParamsSchema, {
		mandatoryKeys: input.mandatoryKeys,
		optionalKeys: input.optionalKeys,
		numberOfSignatures: input.numberOfSignatures,
	});
	const params = {
		mandatoryKeys: input.mandatoryKeys,
		optionalKeys: input.optionalKeys,
		numberOfSignatures: input.numberOfSignatures,
	};
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(input.senderPassphrase);
	const transaction = [...input.passphrases].reduce<Record<string, unknown>>(
		(prev, current) => {
			return signMultiSignatureTransaction(
				registerMultisignatureParamsSchema,
				prev,
				input.networkIdentifier,
				current,
				params,
				true,
			);
		},
		{
			moduleID: 12,
			commandID: 0,
			nonce: input.nonce,
			senderPublicKey: publicKey,
			fee: input.fee ?? BigInt('1100000000'),
			params,
			signatures: [],
		},
	);

	const tx = new Transaction({ ...transaction, params: encodedAsset } as any);
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
	const command = new TransferCommand(MODULE_ID_TOKEN);
	const params = {
		tokenID: DEFAULT_TOKEN_ID,
		recipientAddress: input.recipientAddress,
		amount: BigInt('10000000000'),
		data: '',
	};
	const encodedAsset = codec.encode(command.schema, params);
	const transaction = input.passphrases.reduce<Record<string, unknown>>(
		(prev, current) => {
			return signMultiSignatureTransaction(command.schema, prev, input.networkIdentifier, current, {
				mandatoryKeys: input.mandatoryKeys,
				optionalKeys: input.optionalKeys,
			});
		},
		{
			moduleID: 2,
			commandID: 0,
			nonce: input.nonce,
			senderPublicKey: input.senderPublicKey,
			fee: input.fee ?? BigInt('1100000000'),
			params,
			signatures: [],
		},
	);

	const tx = new Transaction({ ...transaction, params: encodedAsset } as any);
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
	const encodedAsset = codec.encode(pomCommandParamsSchema, {
		header1: input.header1.getBytes(),
		header2: input.header2.getBytes(),
	});
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(input.passphrase);

	const tx = new Transaction({
		moduleID: 13,
		commandID: 3,
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee ?? BigInt('50000000'),
		params: encodedAsset,
		signatures: [],
	});
	tx.signatures.push(
		signData(TAG_TRANSACTION, input.networkIdentifier, tx.getSigningBytes(), input.passphrase),
	);
	return tx;
};
