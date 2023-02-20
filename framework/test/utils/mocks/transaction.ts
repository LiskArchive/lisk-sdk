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
import { ed, address } from '@liskhq/lisk-cryptography';
import { signMultiSignatureTransaction } from '@liskhq/lisk-transactions';
import { TokenModule } from '../../../src';
import { MESSAGE_TAG_MULTISIG_REG } from '../../../src/modules/auth/constants';
import {
	multisigRegMsgSchema,
	registerMultisignatureParamsSchema,
} from '../../../src/modules/auth/schemas';
import { VALIDATOR_REGISTRATION_FEE } from '../../../src/modules/pos/constants';
import {
	validatorRegistrationCommandParamsSchema,
	reportMisbehaviorCommandParamsSchema,
	stakeCommandParamsSchema,
	changeCommissionCommandParamsSchema,
} from '../../../src/modules/pos/schemas';
import { TransferCommand } from '../../../src/modules/token/commands/transfer';
import { transferParamsSchema } from '../../../src/modules/token/schemas';

export const DEFAULT_LOCAL_ID = Buffer.from([0, 0, 0, 0]);

export const defaultTokenID = (chainID: Buffer) => Buffer.concat([chainID, DEFAULT_LOCAL_ID]);

export const createTransferTransaction = (input: {
	recipientAddress: Buffer;
	amount?: bigint;
	nonce: bigint;
	chainID: Buffer;
	privateKey: Buffer;
	fee?: bigint;
}): Transaction => {
	const encodedParams = codec.encode(transferParamsSchema, {
		tokenID: defaultTokenID(input.chainID),
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

export const createValidatorRegisterTransaction = (input: {
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
	const encodedAsset = codec.encode(validatorRegistrationCommandParamsSchema, {
		name: input.username,
		generatorKey: input.generatorKey,
		blsKey: input.blsKey,
		proofOfPossession: input.blsProofOfPossession,
		validatorRegistrationFee: VALIDATOR_REGISTRATION_FEE,
	});

	const tx = new Transaction({
		module: 'pos',
		command: 'registerValidator',
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

export const createValidatorStakeTransaction = (input: {
	nonce: bigint;
	chainID: Buffer;
	privateKey: Buffer;
	fee?: bigint;
	stakes: { validatorAddress: Buffer; amount: bigint }[];
}): Transaction => {
	const encodedAsset = codec.encode(stakeCommandParamsSchema, {
		stakes: input.stakes,
	});
	const publicKey = ed.getPublicKeyFromPrivateKey(input.privateKey);

	const tx = new Transaction({
		module: 'pos',
		command: 'stake',
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

export const createChangeCommissionTransaction = (input: {
	nonce: bigint;
	chainID: Buffer;
	privateKey: Buffer;
	newCommission: number;
	fee?: bigint;
}): Transaction => {
	const encodedAsset = codec.encode(changeCommissionCommandParamsSchema, {
		newCommission: input.newCommission,
	});
	const publicKey = ed.getPublicKeyFromPrivateKey(input.privateKey);

	const tx = new Transaction({
		module: 'pos',
		command: 'changeCommission',
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

export const createClaimRewardTransaction = (input: {
	nonce: bigint;
	chainID: Buffer;
	privateKey: Buffer;
	fee?: bigint;
}): Transaction => {
	const publicKey = ed.getPublicKeyFromPrivateKey(input.privateKey);

	const tx = new Transaction({
		module: 'pos',
		command: 'claimRewards',
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee ?? BigInt('100000000'),
		params: Buffer.alloc(0),
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
			return ed.signData(MESSAGE_TAG_MULTISIG_REG, input.chainID, encodedMessage, privateKey);
		});
	}

	const params = {
		mandatoryKeys: input.mandatoryKeys,
		optionalKeys: input.optionalKeys,
		numberOfSignatures: input.numberOfSignatures,
		signatures: memberSignatures,
	};
	const encodedAsset = codec.encode(registerMultisignatureParamsSchema, params);

	const unsignedTx = {
		module: 'auth',
		command: 'registerMultisignature',
		nonce: input.nonce,
		senderPublicKey: input.senderPublicKey,
		fee: input.fee ?? BigInt('1100000000'),
		signatures: [],
		params: encodedAsset,
	};
	const unsignedTxObj = new Transaction({ ...unsignedTx });

	const senderSignature = ed.signData(
		TAG_TRANSACTION,
		input.chainID,
		unsignedTxObj.getSigningBytes(),
		input.privateKeys[0],
	);
	const transaction = {
		module: 'auth',
		command: 'registerMultisignature',
		nonce: input.nonce,
		senderPublicKey: input.senderPublicKey,
		fee: input.fee ?? BigInt('1100000000'),
		signatures: [senderSignature],
		params: encodedAsset,
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
		tokenID: defaultTokenID(input.chainID),
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
	const encodedAsset = codec.encode(reportMisbehaviorCommandParamsSchema, {
		header1: input.header1.getBytes(),
		header2: input.header2.getBytes(),
	});
	const publicKey = ed.getPublicKeyFromPrivateKey(input.privateKey);

	const tx = new Transaction({
		module: 'pos',
		command: 'reportMisbehavior',
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
