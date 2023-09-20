/*
 * Copyright © 2022 Lisk Foundation
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
import * as crypto from 'crypto';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { parseKeyDerivationPath, hash, tagMessage } from './utils';
import { ED25519_CURVE, EMPTY_BUFFER, MESSAGE_TAG_NON_PROTOCOL_MESSAGE } from './constants';
import {
	NACL_SIGN_PUBLICKEY_LENGTH,
	NACL_SIGN_SIGNATURE_LENGTH,
	getKeyPair,
	getPublicKey,
	signDetached,
	verifyDetached,
} from './nacl';

const createHeader = (text: string): string => `-----${text}-----`;
const signedMessageHeader = createHeader('BEGIN LISK SIGNED MESSAGE');
const messageHeader = createHeader('MESSAGE');
const publicKeyHeader = createHeader('PUBLIC KEY');
const signatureHeader = createHeader('SIGNATURE');
const signatureFooter = createHeader('END LISK SIGNED MESSAGE');

export const getPublicKeyFromPrivateKey = (pk: Buffer): Buffer => getPublicKey(pk);

const getMasterKeyFromSeed = (seed: Buffer) => {
	const hmac = crypto.createHmac('sha512', ED25519_CURVE);
	const digest = hmac.update(seed).digest();
	const leftBytes = digest.subarray(0, 32);
	const rightBytes = digest.subarray(32);
	return {
		key: leftBytes,
		chainCode: rightBytes,
	};
};

const getChildKey = (node: { key: Buffer; chainCode: Buffer }, index: number) => {
	const indexBuffer = Buffer.allocUnsafe(4);
	indexBuffer.writeUInt32BE(index, 0);
	const data = Buffer.concat([Buffer.alloc(1, 0), node.key, indexBuffer]);
	const digest = crypto.createHmac('sha512', node.chainCode).update(data).digest();
	const leftBytes = digest.subarray(0, 32);
	const rightBytes = digest.subarray(32);

	return {
		key: leftBytes,
		chainCode: rightBytes,
	};
};

export const getPrivateKeyFromPhraseAndPath = async (
	phrase: string,
	path: string,
): Promise<Buffer> => {
	const masterSeed = await Mnemonic.mnemonicToSeed(phrase);
	let node = getMasterKeyFromSeed(masterSeed);

	for (const segment of parseKeyDerivationPath(path)) {
		node = getChildKey(node, segment);
	}

	return getKeyPair(node.key).privateKey;
};

export const signMessageWithPrivateKey = (
	message: string | Buffer,
	privateKey: Buffer,
	tag = MESSAGE_TAG_NON_PROTOCOL_MESSAGE,
): SignedMessage => {
	const messageBuffer = typeof message === 'string' ? Buffer.from(message, 'utf8') : message;
	const publicKey = getPublicKey(privateKey);
	const signature = signDataWithPrivateKey(tag, EMPTY_BUFFER, messageBuffer, privateKey);

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
	tag = MESSAGE_TAG_NON_PROTOCOL_MESSAGE,
}: SignedMessageWithTag): boolean => {
	if (publicKey.length !== NACL_SIGN_PUBLICKEY_LENGTH) {
		throw new Error(`Invalid publicKey, expected ${NACL_SIGN_PUBLICKEY_LENGTH}-byte publicKey`);
	}

	if (signature.length !== NACL_SIGN_SIGNATURE_LENGTH) {
		throw new Error(
			`Invalid signature length, expected ${NACL_SIGN_SIGNATURE_LENGTH}-byte signature`,
		);
	}

	const messageBuffer = typeof message === 'string' ? Buffer.from(message, 'utf8') : message;

	return verifyData(tag, EMPTY_BUFFER, messageBuffer, signature, publicKey);
};

export interface SignedMessage {
	readonly message: string | Buffer;
	readonly publicKey: Buffer;
	readonly signature: Buffer;
}

interface SignedMessageWithTag extends SignedMessage {
	tag?: string;
}

// Old redundant interface SignedMessageWithPrivateKey for backwards compatibility
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SignedMessageWithPrivateKey extends SignedMessage {}

export const printSignedMessage = ({ message, signature, publicKey }: SignedMessage): string =>
	[
		signedMessageHeader,
		messageHeader,
		typeof message === 'string' ? message : message.toString('hex'),
		publicKeyHeader,
		publicKey.toString('hex'),
		signatureHeader,
		signature.toString('hex'),
		signatureFooter,
	]
		.filter(Boolean)
		.join('\n');

export const signAndPrintMessage = (message: string, privateKey: Buffer): string => {
	const signedMessage = signMessageWithPrivateKey(message, privateKey);

	return printSignedMessage(signedMessage);
};

export const signDataWithPrivateKey = (
	tag: string,
	chainID: Buffer,
	data: Buffer,
	privateKey: Buffer,
): Buffer => signDetached(hash(tagMessage(tag, chainID, data)), privateKey);

export const signData = signDataWithPrivateKey;

export const verifyData = (
	tag: string,
	chainID: Buffer,
	data: Buffer,
	signature: Buffer,
	publicKey: Buffer,
): boolean => verifyDetached(hash(tagMessage(tag, chainID, data)), signature, publicKey);
