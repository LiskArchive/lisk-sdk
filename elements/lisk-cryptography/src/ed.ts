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
import { ED25519_CURVE, EMPTY_BUFFER } from './constants';
import {
	NACL_SIGN_PUBLICKEY_LENGTH,
	NACL_SIGN_SIGNATURE_LENGTH,
	getKeyPair,
	getPublicKey,
	signDetached,
	verifyDetached,
} from './nacl';

const MESSAGE_TAG_NON_PROTOCOL_MESSAGE = 'LSK_NPM_';

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
	const leftBytes = digest.slice(0, 32);
	const rightBytes = digest.slice(32);
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
	const leftBytes = digest.slice(0, 32);
	const rightBytes = digest.slice(32);

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

export interface SignedMessageWithPrivateKey {
	readonly message: string;
	readonly publicKey: Buffer;
	readonly signature: Buffer;
}

export const signMessageWithPrivateKey = (
	message: string,
	privateKey: Buffer,
): SignedMessageWithPrivateKey => {
	const publicKey = getPublicKey(privateKey);
	const signature = signDataWithPrivateKey(
		MESSAGE_TAG_NON_PROTOCOL_MESSAGE,
		EMPTY_BUFFER,
		Buffer.from(message, 'utf8'),
		privateKey,
	);

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
}: SignedMessageWithPrivateKey): boolean => {
	if (publicKey.length !== NACL_SIGN_PUBLICKEY_LENGTH) {
		throw new Error(`Invalid publicKey, expected ${NACL_SIGN_PUBLICKEY_LENGTH}-byte publicKey`);
	}

	if (signature.length !== NACL_SIGN_SIGNATURE_LENGTH) {
		throw new Error(
			`Invalid signature length, expected ${NACL_SIGN_SIGNATURE_LENGTH}-byte signature`,
		);
	}

	return verifyData(
		MESSAGE_TAG_NON_PROTOCOL_MESSAGE,
		EMPTY_BUFFER,
		Buffer.from(message, 'utf8'),
		signature,
		publicKey,
	);
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
