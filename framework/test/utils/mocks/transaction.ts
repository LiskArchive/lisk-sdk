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
import { bls, ed, legacy, address } from '@liskhq/lisk-cryptography';
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
	const { publicKey, privateKey } = legacy.getPrivateAndPublicKeyFromPassphrase(input.passphrase);

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
		ed.signData(TAG_TRANSACTION, input.networkIdentifier, tx.getSigningBytes(), privateKey),
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
	const { publicKey, privateKey } = legacy.getPrivateAndPublicKeyFromPassphrase(input.passphrase);
	const blsSK = bls.generatePrivateKey(Buffer.from(input.passphrase, 'utf-8'));
	const blsPK = bls.getPublicKeyFromPrivateKey(blsSK);
	const blsPop = bls.popProve(blsSK);
	const encodedAsset = codec.encode(delegateRegistrationCommandParamsSchema, {
		name: input.username,
		generatorKey: publicKey,
		blsKey: blsPK,
		proofOfPossession: blsPop,
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
		ed.signData(TAG_TRANSACTION, input.networkIdentifier, tx.getSigningBytes(), privateKey),
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
	const { publicKey, privateKey } = legacy.getPrivateAndPublicKeyFromPassphrase(input.passphrase);

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
		ed.signData(TAG_TRANSACTION, input.networkIdentifier, tx.getSigningBytes(), privateKey),
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
	signatures?: Buffer[];
	passphrases: string[];
}): Transaction => {
	let memberSignatures = input.signatures;
	if (!memberSignatures) {
		const { publicKey } = legacy.getKeys(input.senderPassphrase);
		const senderAddress = address.getAddressFromPublicKey(publicKey);
		const encodedMessage = codec.encode(multisigRegMsgSchema, {
			mandatoryKeys: input.mandatoryKeys,
			optionalKeys: input.optionalKeys,
			numberOfSignatures: input.numberOfSignatures,
			nonce: input.nonce,
			address: senderAddress,
		});

		memberSignatures = [...input.passphrases].map(passphrase => {
			const { privateKey } = legacy.getKeys(passphrase);
			return ed.signData(
				MESSAGE_TAG_MULTISIG_REG,
				input.networkIdentifier,
				encodedMessage,
				privateKey,
			);
		});
	}

	const params = {
		mandatoryKeys: input.mandatoryKeys,
		optionalKeys: input.optionalKeys,
		numberOfSignatures: input.numberOfSignatures,
		signatures: memberSignatures,
	};
	const encodedAsset = codec.encode(registerMultisignatureParamsSchema, params);
	const { publicKey, privateKey } = legacy.getPrivateAndPublicKeyFromPassphrase(
		input.senderPassphrase,
	);
	const unsignedTx = {
		module: 'auth',
		command: 'registerMultisignature',
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee ?? BigInt('1100000000'),
		signatures: [],
		params: encodedAsset,
	};
	const unsignedTxObj = new Transaction({ ...unsignedTx });

	const senderSignature = ed.signData(
		TAG_TRANSACTION,
		input.networkIdentifier,
		unsignedTxObj.getSigningBytes(),
		privateKey,
	);
	const transaction = {
		module: 'auth',
		command: 'registerMultisignature',
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee ?? BigInt('1100000000'),
		signatures: [senderSignature],
		params: encodedAsset,
	};

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
	const mod = new TokenModule();
	const command = new TransferCommand(mod.stores, mod.events);
	const params = {
		tokenID: DEFAULT_TOKEN_ID,
		recipientAddress: input.recipientAddress,
		amount: BigInt('10000000000'),
		data: '',
	};
	const encodedAsset = codec.encode(command.schema, params);
	const transaction = input.passphrases.reduce<Record<string, unknown>>(
		(prev, current) => {
			const { privateKey } = legacy.getPrivateAndPublicKeyFromPassphrase(current);
			return signMultiSignatureTransaction(
				prev,
				input.networkIdentifier,
				privateKey,
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
	const { publicKey, privateKey } = legacy.getPrivateAndPublicKeyFromPassphrase(input.passphrase);

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
		ed.signData(TAG_TRANSACTION, input.networkIdentifier, tx.getSigningBytes(), privateKey),
	);
	return tx;
};
