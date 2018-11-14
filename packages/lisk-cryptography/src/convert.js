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
import querystring from 'querystring';
import reverseBuffer from 'buffer-reverse';
import ed2curve from 'ed2curve';
import hash from './hash';
import { bufferToBigNumberString } from './buffer';

export const getFirstEightBytesReversed = publicKeyBytes =>
	reverseBuffer(Buffer.from(publicKeyBytes).slice(0, 8));

export const toAddress = buffer => {
	if (
		!Buffer.from(buffer)
			.slice(0, 8)
			.equals(buffer)
	) {
		throw new Error(
			'The buffer for Lisk addresses must not have more than 8 bytes',
		);
	}
	return `${bufferToBigNumberString(buffer)}L`;
};

export const getAddressFromPublicKey = publicKey => {
	const publicKeyHash = hash(publicKey, 'hex');

	const publicKeyTransform = getFirstEightBytesReversed(publicKeyHash);
	const address = toAddress(publicKeyTransform);

	return address;
};

export const convertPublicKeyEd2Curve = ed2curve.convertPublicKey;

export const convertPrivateKeyEd2Curve = ed2curve.convertSecretKey;

export const stringifyEncryptedPassphrase = encryptedPassphrase => {
	if (typeof encryptedPassphrase !== 'object' || encryptedPassphrase === null) {
		throw new Error('Encrypted passphrase to stringify must be an object.');
	}
	const objectToStringify = encryptedPassphrase.iterations
		? encryptedPassphrase
		: {
				salt: encryptedPassphrase.salt,
				cipherText: encryptedPassphrase.cipherText,
				iv: encryptedPassphrase.iv,
				tag: encryptedPassphrase.tag,
				version: encryptedPassphrase.version,
		  };
	return querystring.stringify(objectToStringify);
};

const parseIterations = iterationsString => {
	const iterations =
		iterationsString === undefined ? undefined : parseInt(iterationsString, 10);

	if (Number.isNaN(iterations)) {
		throw new Error('Could not parse iterations.');
	}

	return iterations;
};

export const parseEncryptedPassphrase = encryptedPassphrase => {
	if (typeof encryptedPassphrase !== 'string') {
		throw new Error('Encrypted passphrase to parse must be a string.');
	}
	const keyValuePairs = querystring.parse(encryptedPassphrase);
	const { iterations, salt, cipherText, iv, tag, version } = keyValuePairs;

	return {
		iterations: parseIterations(iterations),
		salt,
		cipherText,
		iv,
		tag,
		version,
	};
};
