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
 *
 */
import * as BigNum from '@liskhq/bignum';
import * as cryptography from '@liskhq/lisk-cryptography';
import { TransferAsset } from '../0_transfer_transaction';
import { SecondSignatureAsset } from '../1_second_signature_transaction';
import { DelegateAsset } from '../2_delegate_transaction';
import { VoteAsset } from '../3_vote_transaction';
import { MultiSignatureAsset } from '../4_multisignature_transaction';
import { DappAsset } from '../5_dapp_transaction';
import { BYTESIZES, MAX_TRANSACTION_AMOUNT } from '../constants';
import { TransactionJSON } from '../transaction_types';

// FIXME: Deprecated
export const isValidValue = (value: unknown): boolean => {
	if (value === undefined) {
		return false;
	}
	if (typeof value === 'number' && Number.isNaN(value)) {
		return false;
	}
	if (value === false) {
		return false;
	}

	return true;
};

// FIXME: Deprecated
export const checkRequiredFields = (
	requiredFields: ReadonlyArray<string>,
	data: { readonly [key: string]: unknown },
): boolean => {
	const dataFields = Object.keys(data);
	requiredFields.forEach(parameter => {
		if (!dataFields.includes(parameter) || !isValidValue(data[parameter])) {
			throw new Error(`${parameter} is a required parameter.`);
		}
	});

	return true;
};

// FIXME: Deprecated
export const getAssetDataForTransferTransaction = ({
	data,
}: TransferAsset): Buffer =>
	data ? Buffer.from(data, 'utf8') : Buffer.alloc(0);

// FIXME: Deprecated
export const getAssetDataForRegisterSecondSignatureTransaction = ({
	signature,
}: SecondSignatureAsset): Buffer => {
	checkRequiredFields(['publicKey'], signature);
	const { publicKey } = signature;

	return cryptography.hexToBuffer(publicKey);
};

// FIXME: Deprecated
export const getAssetDataForRegisterDelegateTransaction = ({
	delegate,
}: DelegateAsset): Buffer => {
	checkRequiredFields(['username'], delegate);
	const { username } = delegate;

	return Buffer.from(username, 'utf8');
};

// FIXME: Deprecated
export const getAssetDataForCastVotesTransaction = ({
	votes,
}: VoteAsset): Buffer => {
	if (!Array.isArray(votes)) {
		throw new Error('votes parameter must be an Array.');
	}

	return Buffer.from(votes.join(''), 'utf8');
};

// FIXME: Deprecated
export const getAssetDataForRegisterMultisignatureAccountTransaction = ({
	multisignature,
}: MultiSignatureAsset): Buffer => {
	checkRequiredFields(['min', 'lifetime', 'keysgroup'], multisignature);
	const { min, lifetime, keysgroup } = multisignature;
	const minBuffer = Buffer.alloc(1, min);
	const lifetimeBuffer = Buffer.alloc(1, lifetime);
	const keysgroupBuffer = Buffer.from(keysgroup.join(''), 'utf8');

	return Buffer.concat([minBuffer, lifetimeBuffer, keysgroupBuffer]);
};

const DAPP_TYPE_LENGTH = 4;
const DAPP_CATEGORY_LENGTH = 4;

// FIXME: Deprecated
export const getAssetDataForCreateDappTransaction = ({
	dapp,
}: DappAsset): Buffer => {
	checkRequiredFields(['name', 'link', 'type', 'category'], dapp);
	const { name, description, tags, link, icon, type, category } = dapp;
	const nameBuffer = Buffer.from(name, 'utf8');
	const linkBuffer = Buffer.from(link, 'utf8');
	const typeBuffer = Buffer.alloc(DAPP_TYPE_LENGTH);
	typeBuffer.writeIntLE(type, 0, DAPP_TYPE_LENGTH);
	const categoryBuffer = Buffer.alloc(DAPP_CATEGORY_LENGTH);
	categoryBuffer.writeIntLE(category, 0, DAPP_CATEGORY_LENGTH);

	const descriptionBuffer = description
		? Buffer.from(description, 'utf8')
		: Buffer.alloc(0);
	const tagsBuffer = tags ? Buffer.from(tags, 'utf8') : Buffer.alloc(0);
	const iconBuffer = icon ? Buffer.from(icon, 'utf8') : Buffer.alloc(0);

	return Buffer.concat([
		nameBuffer,
		descriptionBuffer,
		tagsBuffer,
		linkBuffer,
		iconBuffer,
		typeBuffer,
		categoryBuffer,
	]);
};

// FIXME: Deprecated
export interface InTransferAsset {
	readonly inTransfer: {
		readonly dappId: string;
	};
}

// FIXME: Deprecated
export const getAssetDataForTransferIntoDappTransaction = ({
	inTransfer,
}: InTransferAsset): Buffer => {
	checkRequiredFields(['dappId'], inTransfer);
	const { dappId } = inTransfer;

	return Buffer.from(dappId, 'utf8');
};

// FIXME: Deprecated
export interface OutTransferAsset {
	readonly outTransfer: {
		readonly dappId: string;
		readonly transactionId: string;
	};
}

// FIXME: Deprecated
export const getAssetDataForTransferOutOfDappTransaction = ({
	outTransfer,
}: OutTransferAsset): Buffer => {
	checkRequiredFields(['dappId', 'transactionId'], outTransfer);
	const { dappId, transactionId } = outTransfer;
	const outAppIdBuffer = Buffer.from(dappId, 'utf8');
	const outTransactionIdBuffer = Buffer.from(transactionId, 'utf8');

	return Buffer.concat([outAppIdBuffer, outTransactionIdBuffer]);
};

// FIXME: Deprecated
const transactionTypeAssetGetBytesMap: {
	// tslint:disable-next-line no-any
	readonly [type: number]: (asset: any) => Buffer;
} = {
	0: getAssetDataForTransferTransaction,
	1: getAssetDataForRegisterSecondSignatureTransaction,
	2: getAssetDataForRegisterDelegateTransaction,
	3: getAssetDataForCastVotesTransaction,
	4: getAssetDataForRegisterMultisignatureAccountTransaction,
	5: getAssetDataForCreateDappTransaction,
	6: getAssetDataForTransferIntoDappTransaction,
	7: getAssetDataForTransferOutOfDappTransaction,
};

// FIXME: Deprecated
export const getAssetBytes = (transaction: TransactionJSON): Buffer =>
	transactionTypeAssetGetBytesMap[transaction.type](transaction.asset);

const REQUIRED_TRANSACTION_PARAMETERS: ReadonlyArray<string> = [
	'type',
	'timestamp',
	'senderPublicKey',
	'amount',
];

// FIXME: Deprecated
export const checkTransaction = (transaction: TransactionJSON): boolean => {
	checkRequiredFields(REQUIRED_TRANSACTION_PARAMETERS, transaction);
	const { data } = transaction.asset as TransferAsset;
	if (data && data.length > BYTESIZES.DATA) {
		throw new Error(
			`Transaction asset data exceeds size of ${BYTESIZES.DATA}.`,
		);
	}

	return true;
};

// FIXME: Deprecated
export const getTransactionBytes = (transaction: TransactionJSON): Buffer => {
	checkTransaction(transaction);
	const {
		type,
		timestamp,
		senderPublicKey,
		recipientId,
		amount,
		signature,
		signSignature,
	} = transaction;

	const transactionType = Buffer.alloc(BYTESIZES.TYPE, type);
	const transactionTimestamp = Buffer.alloc(BYTESIZES.TIMESTAMP);
	transactionTimestamp.writeIntLE(timestamp, 0, BYTESIZES.TIMESTAMP);

	const transactionSenderPublicKey = cryptography.hexToBuffer(senderPublicKey);

	const transactionRecipientID = recipientId
		? cryptography.bigNumberToBuffer(
				recipientId.slice(0, -1),
				BYTESIZES.RECIPIENT_ID,
		  )
		: Buffer.alloc(BYTESIZES.RECIPIENT_ID);

	const amountBigNum = new BigNum(amount);
	if (amountBigNum.lt(0)) {
		throw new Error('Transaction amount must not be negative.');
	}
	if (amountBigNum.gt(new BigNum(MAX_TRANSACTION_AMOUNT))) {
		throw new Error('Transaction amount is too large.');
	}
	const transactionAmount = amountBigNum.toBuffer({
		endian: 'little',
		size: BYTESIZES.AMOUNT,
	});

	const transactionAssetData = getAssetBytes(transaction);

	const transactionSignature = signature
		? cryptography.hexToBuffer(signature)
		: Buffer.alloc(0);

	const transactionSecondSignature = signSignature
		? cryptography.hexToBuffer(signSignature)
		: Buffer.alloc(0);

	return Buffer.concat([
		transactionType,
		transactionTimestamp,
		transactionSenderPublicKey,
		transactionRecipientID,
		transactionAmount,
		transactionAssetData,
		transactionSignature,
		transactionSecondSignature,
	]);
};
