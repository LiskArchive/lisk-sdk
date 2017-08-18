/*
 * Copyright © 2017 Lisk Foundation
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
/**
 * Crypto module provides functions for byte/fee calculation, hash/address/id/keypair generation,
 * plus signing and verifying of transactions.
 * @class crypto
 */
/* eslint-disable no-plusplus */
import crypto from 'crypto-browserify';
import bignum from 'browserify-bignum';
import constants from './constants';
import cryptoModule from './crypto/index';
import { getBytes } from './transactions/transactionBytes';

/**
 * @method getId
 * @param transaction Object
 *
 * @return {string}
 */

function getId(transaction) {
	const transactionBytes = getBytes(transaction);
	const transactionHash = crypto.createHash('sha256').update(transactionBytes).digest();
	const bufferFromFirstEntriesReversed = transactionHash.slice(0, 8).reverse();
	const firstEntriesToNumber = bignum.fromBuffer(bufferFromFirstEntriesReversed);

	return firstEntriesToNumber.toString();
}

/**
 * @method getHash
 * @param transaction Object
 *
 * @return {string}
 */

function getHash(transaction) {
	const bytes = getBytes(transaction);
	return crypto.createHash('sha256').update(bytes).digest();
}

/**
 * @method getFee
 * @param transaction Object
 *
 * @return {number}
 */

function getFee(transaction) {
	return constants.fee[transaction.type];
}

/**
 * @method sign
 * @param transaction Object
 * @param keys Object
 *
 * @return {string}
 */

function sign(transaction, keys) {
	const hash = getHash(transaction);
	const signature = naclInstance.crypto_sign_detached(hash, Buffer.from(keys.privateKey, 'hex'));
	return Buffer.from(signature).toString('hex');
}

/**
 * @method multiSign
 * @param transaction Object
 * @param keys Object
 *
 * @return {string}
 */

function multiSign(transaction, keys) {
	const signTransaction = transaction;
	delete signTransaction.signature;
	delete signTransaction.signSignature;
	const { privateKey } = keys;
	const bytes = getBytes(signTransaction);
	const hash = crypto.createHash('sha256').update(bytes).digest();
	const signature = naclInstance.crypto_sign_detached(hash, cryptoModule.hexToBuffer(privateKey));

	return Buffer.from(signature).toString('hex');
}
/**
 * @method verify
 * @param transaction Object
 *
 * @return {boolean}
 */

function verify(transaction) {
	let remove = 64;

	if (transaction.signSignature) {
		remove = 128;
	}

	const bytes = getBytes(transaction);
	const data2 = Buffer.alloc(bytes.length - remove);

	for (let i = 0; i < data2.length; i++) {
		data2[i] = bytes[i];
	}

	const hash = crypto.createHash('sha256').update(data2.toString('hex'), 'hex').digest();

	const signatureBuffer = Buffer.from(transaction.signature, 'hex');
	const senderPublicKeyBuffer = Buffer.from(transaction.senderPublicKey, 'hex');
	const res = naclInstance
		.crypto_sign_verify_detached(signatureBuffer, hash, senderPublicKeyBuffer);

	return res;
}

/**
 * @method verifySecondSignature
 * @param transaction Object
 * @param publicKey Object
 *
 * @return {boolean}
 */

function verifySecondSignature(transaction, publicKey) {
	const bytes = getBytes(transaction);
	const data2 = Buffer.alloc(bytes.length - 64);

	for (let i = 0; i < data2.length; i++) {
		data2[i] = bytes[i];
	}

	const hash = crypto.createHash('sha256').update(data2.toString('hex'), 'hex').digest();

	const signSignatureBuffer = Buffer.from(transaction.signSignature, 'hex');
	const publicKeyBuffer = Buffer.from(publicKey, 'hex');
	const res = naclInstance.crypto_sign_verify_detached(signSignatureBuffer, hash, publicKeyBuffer);

	return res;
}

/**
 * @method getKeys
 * @param secret string
 *
 * @return {object}
 */

function getKeys(secret) {
	return cryptoModule.getPrivateAndPublicKeyFromSecret(secret);
}

/**
 * @method getAddress
 * @param publicKey string
 *
 * @return address string
 */

function getAddress(publicKey) {
	const publicKeyHash = cryptoModule.getSha256Hash(publicKey, 'hex');
	const firstEntriesReversed = cryptoModule.useFirstEightBufferEntriesReversed(publicKeyHash);

	return cryptoModule.toAddress(firstEntriesReversed);
}

module.exports = {
	getHash,
	getId,
	getFee,
	sign,
	multiSign,
	getKeys,
	getAddress,
	verify,
	verifySecondSignature,

	cryptoModule,
};
