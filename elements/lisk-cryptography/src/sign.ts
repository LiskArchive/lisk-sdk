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
import { encode as encodeVarInt } from 'varuint-bitcoin';
import { bufferToHex, hexToBuffer } from './buffer';
import { SIGNED_MESSAGE_PREFIX } from './constants';
import { hash } from './hash';
import { getPrivateAndPublicKeyBytesFromPassphrase } from './keys';
import {
	NACL_SIGN_PUBLICKEY_LENGTH,
	NACL_SIGN_SIGNATURE_LENGTH,
	signDetached,
	verifyDetached,
} from './nacl';

const createHeader = (text: string): string => `-----${text}-----`;
const signedMessageHeader = createHeader('BEGIN LISK SIGNED MESSAGE');
const messageHeader = createHeader('MESSAGE');
const publicKeyHeader = createHeader('PUBLIC KEY');
const secondPublicKeyHeader = createHeader('SECOND PUBLIC KEY');
const signatureHeader = createHeader('SIGNATURE');
const secondSignatureHeader = createHeader('SECOND SIGNATURE');
const signatureFooter = createHeader('END LISK SIGNED MESSAGE');

const SIGNED_MESSAGE_PREFIX_BYTES = Buffer.from(SIGNED_MESSAGE_PREFIX, 'utf8');
const SIGNED_MESSAGE_PREFIX_LENGTH = encodeVarInt(SIGNED_MESSAGE_PREFIX.length);

export interface SignedMessageWithOnePassphrase {
	readonly message: string;
	readonly publicKey: string;
	readonly signature: string;
}
export const digestMessage = (message: string): Buffer => {
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

export const signMessageWithPassphrase = (
	message: string,
	passphrase: string,
): SignedMessageWithOnePassphrase => {
	const msgBytes = digestMessage(message);
	const {
		privateKeyBytes,
		publicKeyBytes,
	} = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);
	const signature = signDetached(msgBytes, privateKeyBytes);

	return {
		message,
		publicKey: bufferToHex(publicKeyBytes),
		signature: bufferToHex(signature),
	};
};

export const verifyMessageWithPublicKey = ({
	message,
	publicKey,
	signature,
}: SignedMessageWithOnePassphrase): boolean => {
	const msgBytes = digestMessage(message);
	const signatureBytes = hexToBuffer(signature);
	const publicKeyBytes = hexToBuffer(publicKey);

	if (publicKeyBytes.length !== NACL_SIGN_PUBLICKEY_LENGTH) {
		throw new Error(
			`Invalid publicKey, expected ${NACL_SIGN_PUBLICKEY_LENGTH}-byte publicKey`,
		);
	}

	if (signatureBytes.length !== NACL_SIGN_SIGNATURE_LENGTH) {
		throw new Error(
			`Invalid signature length, expected ${NACL_SIGN_SIGNATURE_LENGTH}-byte signature`,
		);
	}

	return verifyDetached(msgBytes, signatureBytes, publicKeyBytes);
};

export interface SignedMessageWithTwoPassphrases {
	readonly message: string;
	readonly publicKey: string;
	readonly secondPublicKey: string;
	readonly secondSignature: string;
	readonly signature: string;
}

export const signMessageWithTwoPassphrases = (
	message: string,
	passphrase: string,
	secondPassphrase: string,
): SignedMessageWithTwoPassphrases => {
	const msgBytes = digestMessage(message);
	const keypairBytes = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);
	const secondKeypairBytes = getPrivateAndPublicKeyBytesFromPassphrase(
		secondPassphrase,
	);

	const signature = signDetached(msgBytes, keypairBytes.privateKeyBytes);
	const secondSignature = signDetached(
		msgBytes,
		secondKeypairBytes.privateKeyBytes,
	);

	return {
		message,
		publicKey: bufferToHex(keypairBytes.publicKeyBytes),
		secondPublicKey: bufferToHex(secondKeypairBytes.publicKeyBytes),
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
}: SignedMessageWithTwoPassphrases) => {
	const messageBytes = digestMessage(message);
	const signatureBytes = hexToBuffer(signature);
	const secondSignatureBytes = hexToBuffer(secondSignature);
	const publicKeyBytes = hexToBuffer(publicKey);
	const secondPublicKeyBytes = hexToBuffer(secondPublicKey);

	if (signatureBytes.length !== NACL_SIGN_SIGNATURE_LENGTH) {
		throw new Error(
			`Invalid first signature length, expected ${NACL_SIGN_SIGNATURE_LENGTH}-byte signature`,
		);
	}

	if (secondSignatureBytes.length !== NACL_SIGN_SIGNATURE_LENGTH) {
		throw new Error(
			`Invalid second signature length, expected ${NACL_SIGN_SIGNATURE_LENGTH}-byte signature`,
		);
	}

	if (publicKeyBytes.length !== NACL_SIGN_PUBLICKEY_LENGTH) {
		throw new Error(
			`Invalid first publicKey, expected ${NACL_SIGN_PUBLICKEY_LENGTH}-byte publicKey`,
		);
	}

	if (secondPublicKeyBytes.length !== NACL_SIGN_PUBLICKEY_LENGTH) {
		throw new Error(
			`Invalid second publicKey, expected ${NACL_SIGN_PUBLICKEY_LENGTH}-byte publicKey`,
		);
	}

	const verifyFirstSignature = () =>
		verifyDetached(messageBytes, signatureBytes, publicKeyBytes);
	const verifySecondSignature = () =>
		verifyDetached(messageBytes, secondSignatureBytes, secondPublicKeyBytes);

	return verifyFirstSignature() && verifySecondSignature();
};

export interface SingleOrDoubleSignedMessage {
	readonly message: string;
	readonly publicKey: string;
	readonly secondPublicKey?: string;
	readonly secondSignature?: string;
	readonly signature: string;
}

export const printSignedMessage = ({
	message,
	signature,
	publicKey,
	secondSignature,
	secondPublicKey,
}: SingleOrDoubleSignedMessage): string =>
	[
		signedMessageHeader,
		messageHeader,
		message,
		publicKeyHeader,
		publicKey,
		secondPublicKey ? secondPublicKeyHeader : undefined,
		secondPublicKey,
		signatureHeader,
		signature,
		secondSignature ? secondSignatureHeader : undefined,
		secondSignature,
		signatureFooter,
	]
		.filter(Boolean)
		.join('\n');

export const signAndPrintMessage = (
	message: string,
	passphrase: string,
	secondPassphrase?: string,
): string => {
	const signedMessage:
		| SignedMessageWithOnePassphrase
		| SignedMessageWithTwoPassphrases = secondPassphrase
		? signMessageWithTwoPassphrases(message, passphrase, secondPassphrase)
		: signMessageWithPassphrase(message, passphrase);

	return printSignedMessage(signedMessage);
};

export const signDataWithPrivateKey = (
	data: Buffer,
	privateKey: Buffer,
): string => {
	const signature = signDetached(data, privateKey);

	return bufferToHex(signature);
};

export const signDataWithPassphrase = (
	data: Buffer,
	passphrase: string,
): string => {
	const { privateKeyBytes } = getPrivateAndPublicKeyBytesFromPassphrase(
		passphrase,
	);

	return signDataWithPrivateKey(data, privateKeyBytes);
};

export const signData = signDataWithPassphrase;

export const verifyData = (
	data: Buffer,
	signature: string,
	publicKey: string,
): boolean =>
	verifyDetached(data, hexToBuffer(signature), hexToBuffer(publicKey));
