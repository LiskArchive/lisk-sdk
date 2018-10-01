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
import nacl from 'tweetnacl';
import { encode as encodeVarInt } from 'varuint-bitcoin';
import { SIGNED_MESSAGE_PREFIX } from '@liskhq/lisk-constants';
import hash from './hash';
import { hexToBuffer, bufferToHex } from './buffer';
import { getPrivateAndPublicKeyBytesFromPassphrase } from './keys';

const createHeader = text => `-----${text}-----`;
const signedMessageHeader = createHeader('BEGIN LISK SIGNED MESSAGE');
const messageHeader = createHeader('MESSAGE');
const publicKeyHeader = createHeader('PUBLIC KEY');
const secondPublicKeyHeader = createHeader('SECOND PUBLIC KEY');
const signatureHeader = createHeader('SIGNATURE');
const secondSignatureHeader = createHeader('SECOND SIGNATURE');
const signatureFooter = createHeader('END LISK SIGNED MESSAGE');

const SIGNED_MESSAGE_PREFIX_BYTES = Buffer.from(SIGNED_MESSAGE_PREFIX, 'utf8');
const SIGNED_MESSAGE_PREFIX_LENGTH = encodeVarInt(SIGNED_MESSAGE_PREFIX.length);

export const digestMessage = message => {
	const msgBytes = Buffer.from(message, 'utf8');
	const msgLenBytes = encodeVarInt(message.length);
	const dataBytes = Buffer.concat([
		SIGNED_MESSAGE_PREFIX_LENGTH,
		SIGNED_MESSAGE_PREFIX_BYTES,
		msgLenBytes,
		msgBytes,
	]);
	return hash(hash(dataBytes));
};

export const signMessageWithPassphrase = (message, passphrase) => {
	const msgBytes = digestMessage(message);
	const { privateKey, publicKey } = getPrivateAndPublicKeyBytesFromPassphrase(
		passphrase,
	);
	const signature = nacl.sign.detached(msgBytes, privateKey);

	return {
		message,
		publicKey: bufferToHex(publicKey),
		signature: bufferToHex(signature),
	};
};

export const verifyMessageWithPublicKey = ({
	message,
	signature,
	publicKey,
}) => {
	const msgBytes = digestMessage(message);
	const signatureBytes = hexToBuffer(signature);
	const publicKeyBytes = hexToBuffer(publicKey);

	if (publicKeyBytes.length !== nacl.sign.publicKeyLength) {
		throw new Error('Invalid publicKey, expected 32-byte publicKey');
	}

	if (signatureBytes.length !== nacl.sign.signatureLength) {
		throw new Error('Invalid signature length, expected 64-byte signature');
	}

	return nacl.sign.detached.verify(msgBytes, signatureBytes, publicKeyBytes);
};

export const signMessageWithTwoPassphrases = (
	message,
	passphrase,
	secondPassphrase,
) => {
	const msgBytes = digestMessage(message);
	const keypairBytes = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);
	const secondKeypairBytes = getPrivateAndPublicKeyBytesFromPassphrase(
		secondPassphrase,
	);

	const signature = nacl.sign.detached(msgBytes, keypairBytes.privateKey);
	const secondSignature = nacl.sign.detached(
		msgBytes,
		secondKeypairBytes.privateKey,
	);

	return {
		message,
		publicKey: bufferToHex(keypairBytes.publicKey),
		secondPublicKey: bufferToHex(secondKeypairBytes.publicKey),
		signature: bufferToHex(signature),
		secondSignature: bufferToHex(secondSignature),
	};
};

export const verifyMessageWithTwoPublicKeys = ({
	message,
	signature,
	secondSignature,
	publicKey,
	secondPublicKey,
}) => {
	const messageBytes = digestMessage(message);
	const signatureBytes = hexToBuffer(signature);
	const secondSignatureBytes = hexToBuffer(secondSignature);
	const publicKeyBytes = hexToBuffer(publicKey);
	const secondPublicKeyBytes = hexToBuffer(secondPublicKey);

	if (signatureBytes.length !== nacl.sign.signatureLength) {
		throw new Error(
			'Invalid first signature length, expected 64-byte signature',
		);
	}

	if (secondSignatureBytes.length !== nacl.sign.signatureLength) {
		throw new Error(
			'Invalid second signature length, expected 64-byte signature',
		);
	}

	if (publicKeyBytes.length !== nacl.sign.publicKeyLength) {
		throw new Error('Invalid first publicKey, expected 32-byte publicKey');
	}

	if (secondPublicKeyBytes.length !== nacl.sign.publicKeyLength) {
		throw new Error('Invalid second publicKey, expected 32-byte publicKey');
	}

	const verifyFirstSignature = () =>
		nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
	const verifySecondSignature = () =>
		nacl.sign.detached.verify(
			messageBytes,
			secondSignatureBytes,
			secondPublicKeyBytes,
		);

	return verifyFirstSignature() && verifySecondSignature();
};

export const printSignedMessage = ({
	message,
	signature,
	publicKey,
	secondSignature,
	secondPublicKey,
}) =>
	[
		signedMessageHeader,
		messageHeader,
		message,
		publicKeyHeader,
		publicKey,
		secondPublicKey ? secondPublicKeyHeader : null,
		secondPublicKey,
		signatureHeader,
		signature,
		secondSignature ? secondSignatureHeader : null,
		secondSignature,
		signatureFooter,
	]
		.filter(Boolean)
		.join('\n');

export const signAndPrintMessage = (message, passphrase, secondPassphrase) => {
	const signedMessage = secondPassphrase
		? signMessageWithTwoPassphrases(message, passphrase, secondPassphrase)
		: signMessageWithPassphrase(message, passphrase);

	return printSignedMessage(signedMessage);
};

export const signDataWithPrivateKey = (data, privateKey) => {
	const signature = nacl.sign.detached(data, privateKey);
	return bufferToHex(signature);
};

export const signDataWithPassphrase = (data, passphrase) => {
	const { privateKey } = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);
	return signDataWithPrivateKey(data, privateKey);
};

export const signData = signDataWithPassphrase;

export const verifyData = (data, signature, publicKey) =>
	nacl.sign.detached.verify(
		data,
		hexToBuffer(signature),
		hexToBuffer(publicKey),
	);
