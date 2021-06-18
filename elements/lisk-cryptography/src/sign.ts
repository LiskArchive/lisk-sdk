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
import { SIGNED_MESSAGE_PREFIX } from './constants';
import { hash } from './hash';
import { getPrivateAndPublicKeyFromPassphrase } from './keys';
import { tagMessage } from './message_tag';
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
const signatureHeader = createHeader('SIGNATURE');
const signatureFooter = createHeader('END LISK SIGNED MESSAGE');

const SIGNED_MESSAGE_PREFIX_BYTES = Buffer.from(SIGNED_MESSAGE_PREFIX, 'utf8');
const SIGNED_MESSAGE_PREFIX_LENGTH = encodeVarInt(SIGNED_MESSAGE_PREFIX.length);

export interface SignedMessageWithOnePassphrase {
	readonly message: string;
	readonly publicKey: Buffer;
	readonly signature: Buffer;
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
	const { privateKey, publicKey } = getPrivateAndPublicKeyFromPassphrase(passphrase);
	const signature = signDetached(msgBytes, privateKey);

	return {
		message,
		publicKey,
		signature,
	};
};

export const verifyMessageWithPublicKey = ({
	message,
	publicKey,
	signature,
}: SignedMessageWithOnePassphrase): boolean => {
	const msgBytes = digestMessage(message);

	if (publicKey.length !== NACL_SIGN_PUBLICKEY_LENGTH) {
		throw new Error(
			`Invalid publicKey, expected ${NACL_SIGN_PUBLICKEY_LENGTH.toString()}-byte publicKey`,
		);
	}

	if (signature.length !== NACL_SIGN_SIGNATURE_LENGTH) {
		throw new Error(
			`Invalid signature length, expected ${NACL_SIGN_SIGNATURE_LENGTH.toString()}-byte signature`,
		);
	}

	return verifyDetached(msgBytes, signature, publicKey);
};

export interface SignedMessage {
	readonly message: string;
	readonly publicKey: Buffer;
	readonly signature: Buffer;
}

export const printSignedMessage = ({ message, signature, publicKey }: SignedMessage): string =>
	[
		signedMessageHeader,
		messageHeader,
		message,
		publicKeyHeader,
		publicKey.toString('hex'),
		signatureHeader,
		signature.toString('hex'),
		signatureFooter,
	]
		.filter(Boolean)
		.join('\n');

export const signAndPrintMessage = (message: string, passphrase: string): string => {
	const signedMessage = signMessageWithPassphrase(message, passphrase);

	return printSignedMessage(signedMessage);
};

export const signDataWithPrivateKey = (
	tag: string,
	networkIdentifier: Buffer,
	data: Buffer,
	privateKey: Buffer,
): Buffer => signDetached(tagMessage(tag, networkIdentifier, data), privateKey);

export const signDataWithPassphrase = (
	tag: string,
	networkIdentifier: Buffer,
	data: Buffer,
	passphrase: string,
): Buffer => {
	const { privateKey } = getPrivateAndPublicKeyFromPassphrase(passphrase);

	return signDataWithPrivateKey(tag, networkIdentifier, data, privateKey);
};

export const signData = signDataWithPassphrase;

export const verifyData = (
	tag: string,
	networkIdentifier: Buffer,
	data: Buffer,
	signature: Buffer,
	publicKey: Buffer,
): boolean => verifyDetached(tagMessage(tag, networkIdentifier, data), signature, publicKey);
