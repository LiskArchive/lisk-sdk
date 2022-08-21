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
import { utils, bls, ed, legacy, address } from '@liskhq/lisk-cryptography';
import { signMultiSignatureTransaction } from '@liskhq/lisk-transactions';
import { TokenModule } from '../../../src';
import { MESSAGE_TAG_MULTISIG_REG } from '../../../src/modules/auth/constants';
import {
	multisigRegMsgSchema,
	registerMultisignatureParamsSchema,
} from '../../../src/modules/auth/schemas';
import {
	delegateRegistrationCommandParamsSchema,
	pomCommandParamsSchema,
	voteCommandParamsSchema,
} from '../../../src/modules/dpos_v2/schemas';
import { TransferCommand } from '../../../src/modules/token/commands/transfer';
import { transferParamsSchema } from '../../../src/modules/token/schemas';

export const DEFAULT_TOKEN_ID = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);

export const createTransferTransaction = (input: {
	recipientAddress: Buffer;
	amount?: bigint;
	nonce: bigint;
	chainID: Buffer;
	privateKey: Buffer;
	fee?: bigint;
}): Transaction => {
	const encodedParams = codec.encode(transferParamsSchema, {
		tokenID: DEFAULT_TOKEN_ID,
		recipientAddress: input.recipientAddress,
		amount: input.amount ?? BigInt('10000000000'),
		data: '',
	});

	const publicKey = ed.getPublicKeyFromPrivateKey(input.privateKey);

	const tx = new Transaction({
		module: 'token',
		command: 'transfer',
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee ?? BigInt('200000'),
		params: encodedParams,
		signatures: [],
	});
	tx.signatures.push(
		ed.signData(TAG_TRANSACTION, input.chainID, tx.getSigningBytes(), input.privateKey),
	);
	return tx;
};

export const createDelegateRegisterTransaction = (input: {
	nonce: bigint;
	chainID: Buffer;
	privateKey: Buffer;
	generatorKey: Buffer;
	blsKey: Buffer;
	blsProofOfPossession: Buffer;
	username: string;
	fee?: bigint;
}): Transaction => {
	const publicKey = ed.getPublicKeyFromPrivateKey(input.privateKey);
	const encodedAsset = codec.encode(delegateRegistrationCommandParamsSchema, {
		name: input.username,
		generatorKey: input.generatorKey,
		blsKey: input.blsKey,
		proofOfPossession: input.blsProofOfPossession,
	});

	const tx = new Transaction({
		module: 'dpos',
		command: 'registerDelegate',
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee ?? BigInt('2500000000'),
		params: encodedAsset,
		signatures: [],
	});
	tx.signatures.push(
		ed.signData(TAG_TRANSACTION, input.chainID, tx.getSigningBytes(), input.privateKey),
	);
	return tx;
};

export const createDelegateVoteTransaction = (input: {
	nonce: bigint;
	chainID: Buffer;
	privateKey: Buffer;
	fee?: bigint;
	votes: { delegateAddress: Buffer; amount: bigint }[];
}): Transaction => {
	const encodedAsset = codec.encode(voteCommandParamsSchema, {
		votes: input.votes,
	});
	const publicKey = ed.getPublicKeyFromPrivateKey(input.privateKey);

	const tx = new Transaction({
		module: 'dpos',
		command: 'voteDelegate',
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee ?? BigInt('100000000'),
		params: encodedAsset,
		signatures: [],
	});
	tx.signatures.push(
		ed.signData(TAG_TRANSACTION, input.chainID, tx.getSigningBytes(), input.privateKey),
	);
	return tx;
};

export const createMultiSignRegisterTransaction = (input: {
	nonce: bigint;
	chainID: Buffer;
	fee?: bigint;
	mandatoryKeys: Buffer[];
	optionalKeys: Buffer[];
	numberOfSignatures: number;
	senderPublicKey: Buffer;
	signatures?: Buffer[];
	privateKeys: Buffer[];
}): Transaction => {
	let memberSignatures = input.signatures;
	if (!memberSignatures) {
		const senderAddress = address.getAddressFromPublicKey(input.senderPublicKey);
		const encodedMessage = codec.encode(multisigRegMsgSchema, {
			mandatoryKeys: input.mandatoryKeys,
			optionalKeys: input.optionalKeys,
			numberOfSignatures: input.numberOfSignatures,
			nonce: input.nonce,
			address: senderAddress,
		});

		memberSignatures = [...input.privateKeys].map(privateKey => {
			return ed.signData(
				MESSAGE_TAG_MULTISIG_REG,
				input.chainID,
				encodedMessage,
				privateKey,
			);
		});
	}

	const encodedAsset = codec.encode(registerMultisignatureParamsSchema, {
		mandatoryKeys: input.mandatoryKeys,
		optionalKeys: input.optionalKeys,
		numberOfSignatures: input.numberOfSignatures,
		signatures: memberSignatures,
	});
	const params = {
		mandatoryKeys: input.mandatoryKeys,
		optionalKeys: input.optionalKeys,
		numberOfSignatures: input.numberOfSignatures,
		signatures: memberSignatures,
	};
	const senderSignature = ed.signData(
		TAG_TRANSACTION,
		input.chainID,
		encodedAsset,
		input.privateKeys[0],
	);
	const transaction = {
		module: 'auth',
		command: 'registerMultisignatureGroup',
		nonce: input.nonce,
		senderPublicKey: input.senderPublicKey,
		fee: input.fee ?? BigInt('1100000000'),
		params,
		signatures: [senderSignature],
	};

	const tx = new Transaction({ ...transaction, params: encodedAsset } as any);
	return tx;
};

export const createMultisignatureTransferTransaction = (input: {
	nonce: bigint;
	chainID: Buffer;
	recipientAddress: Buffer;
	amount: bigint;
	fee?: bigint;
	mandatoryKeys: Buffer[];
	optionalKeys: Buffer[];
	senderPublicKey: Buffer;
	privateKeys: Buffer[];
}): Transaction => {
	const mod = new TokenModule();
	const command = new TransferCommand(mod.stores, mod.events);
	const params = {
		tokenID: DEFAULT_TOKEN_ID,
		recipientAddress: input.recipientAddress,
		amount: BigInt('10000000000'),
		data: '',
	};
	const encodedAsset = codec.encode(command.schema, params);
	const transaction = input.privateKeys.reduce<Record<string, unknown>>(
		(prev, current) => {
			return signMultiSignatureTransaction(
				prev,
				input.chainID,
				current,
				{
					mandatoryKeys: input.mandatoryKeys,
					optionalKeys: input.optionalKeys,
				},
				command.schema,
			);
		},
		{
			module: 'token',
			command: 'transfer',
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
	chainID: Buffer;
	privateKey: Buffer;
	header1: BlockHeader;
	header2: BlockHeader;
	fee?: bigint;
}): Transaction => {
	const encodedAsset = codec.encode(pomCommandParamsSchema, {
		header1: input.header1.getBytes(),
		header2: input.header2.getBytes(),
	});
	const publicKey = ed.getPublicKeyFromPrivateKey(input.privateKey);

	const tx = new Transaction({
		module: 'dpos',
		command: 'reportDelegateMisbehavior',
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee ?? BigInt('50000000'),
		params: encodedAsset,
		signatures: [],
	});
	tx.signatures.push(
		ed.signData(TAG_TRANSACTION, input.chainID, tx.getSigningBytes(), input.privateKey),
	);
	return tx;
};
