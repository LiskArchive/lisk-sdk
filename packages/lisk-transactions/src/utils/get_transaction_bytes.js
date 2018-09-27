/*
 * Copyright © 2018 Lisk Foundation
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
import bignum from 'browserify-bignum';
import { MAX_TRANSACTION_AMOUNT } from '@liskhq/lisk-constants';
import cryptography from '@liskhq/lisk-cryptography';
import { BYTESIZES } from '../constants';

export const isValidValue = value => ![undefined, false, NaN].includes(value);

export const checkRequiredFields = (requiredFields, data) => {
	const dataFields = Object.keys(data);
	requiredFields.forEach(parameter => {
		if (
			!dataFields.includes(parameter.toString()) ||
			!isValidValue(data[parameter])
		) {
			throw new Error(`${parameter} is a required parameter.`);
		}
	});
	return true;
};

export const getAssetDataForTransferTransaction = ({ data }) =>
	data ? Buffer.from(data, 'utf8') : Buffer.alloc(0);

export const getAssetDataForRegisterSecondSignatureTransaction = ({
	signature,
}) => {
	checkRequiredFields(['publicKey'], signature);
	const { publicKey } = signature;
	return cryptography.hexToBuffer(publicKey);
};

export const getAssetDataForRegisterDelegateTransaction = ({ delegate }) => {
	checkRequiredFields(['username'], delegate);
	const { username } = delegate;
	return Buffer.from(username, 'utf8');
};

export const getAssetDataForCastVotesTransaction = ({ votes }) => {
	if (!Array.isArray(votes)) {
		throw new Error('votes parameter must be an Array.');
	}
	return Buffer.from(votes.join(''), 'utf8');
};

export const getAssetDataForRegisterMultisignatureAccountTransaction = ({
	multisignature,
}) => {
	checkRequiredFields(['min', 'lifetime', 'keysgroup'], multisignature);
	const { min, lifetime, keysgroup } = multisignature;
	const minBuffer = Buffer.alloc(1, min);
	const lifetimeBuffer = Buffer.alloc(1, lifetime);
	const keysgroupBuffer = Buffer.from(keysgroup.join(''), 'utf8');

	return Buffer.concat([minBuffer, lifetimeBuffer, keysgroupBuffer]);
};

export const getAssetDataForCreateDappTransaction = ({ dapp }) => {
	checkRequiredFields(['name', 'link', 'type', 'category'], dapp);
	const { name, description, tags, link, icon, type, category } = dapp;
	const nameBuffer = Buffer.from(name, 'utf8');
	const linkBuffer = Buffer.from(link, 'utf8');
	const typeBuffer = Buffer.alloc(4);
	typeBuffer.writeIntLE(type, 0);
	const categoryBuffer = Buffer.alloc(4);
	categoryBuffer.writeIntLE(category, 0);

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

export const getAssetDataForTransferIntoDappTransaction = ({ inTransfer }) => {
	checkRequiredFields(['dappId'], inTransfer);
	const { dappId } = inTransfer;
	return Buffer.from(dappId, 'utf8');
};

export const getAssetDataForTransferOutOfDappTransaction = ({
	outTransfer,
}) => {
	checkRequiredFields(['dappId', 'transactionId'], outTransfer);
	const { dappId, transactionId } = outTransfer;
	const outAppIdBuffer = Buffer.from(dappId, 'utf8');
	const outTransactionIdBuffer = Buffer.from(transactionId, 'utf8');

	return Buffer.concat([outAppIdBuffer, outTransactionIdBuffer]);
};

export const getAssetBytes = transaction =>
	({
		0: getAssetDataForTransferTransaction,
		1: getAssetDataForRegisterSecondSignatureTransaction,
		2: getAssetDataForRegisterDelegateTransaction,
		3: getAssetDataForCastVotesTransaction,
		4: getAssetDataForRegisterMultisignatureAccountTransaction,
		5: getAssetDataForCreateDappTransaction,
		6: getAssetDataForTransferIntoDappTransaction,
		7: getAssetDataForTransferOutOfDappTransaction,
	}[transaction.type](transaction.asset));

const REQUIRED_TRANSACTION_PARAMETERS = [
	'type',
	'timestamp',
	'senderPublicKey',
	'amount',
];

export const checkTransaction = transaction => {
	checkRequiredFields(REQUIRED_TRANSACTION_PARAMETERS, transaction);
	const {
		asset: { data },
	} = transaction;
	if (data && data.length > BYTESIZES.DATA) {
		throw new Error(
			`Transaction asset data exceeds size of ${BYTESIZES.DATA}.`,
		);
	}
	return true;
};

const getTransactionBytes = transaction => {
	checkTransaction(transaction);

	const {
		type,
		timestamp,
		requesterPublicKey,
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
	const transactionRequesterPublicKey = requesterPublicKey
		? cryptography.hexToBuffer(requesterPublicKey)
		: Buffer.alloc(0);

	const transactionRecipientID = recipientId
		? cryptography.bigNumberToBuffer(
				recipientId.slice(0, -1),
				BYTESIZES.RECIPIENT_ID,
		  )
		: Buffer.alloc(BYTESIZES.RECIPIENT_ID);

	const amountBigNum = bignum(amount);
	if (amountBigNum.lt(0)) {
		throw new Error('Transaction amount must not be negative.');
	}
	// BUG in browserify-bignum prevents us using `.gt` directly.
	// See https://github.com/bored-engineer/browserify-bignum/pull/2
	if (amountBigNum.gte(bignum(MAX_TRANSACTION_AMOUNT).plus(1))) {
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
		transactionRequesterPublicKey,
		transactionRecipientID,
		transactionAmount,
		transactionAssetData,
		transactionSignature,
		transactionSecondSignature,
	]);
};

export default getTransactionBytes;
