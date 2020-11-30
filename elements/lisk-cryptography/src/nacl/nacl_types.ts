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
import { Keypair } from '../types';

export interface NaclInterface {
	box: (
		messageInBytes: Buffer,
		nonceInBytes: Buffer,
		convertedPublicKey: Buffer,
		convertedPrivateKey: Buffer,
	) => Buffer;
	getKeyPair: (hashedSeed: Buffer) => Keypair;
	getPublicKey: (privateKey: Buffer) => Buffer;
	getRandomBytes: (length: number) => Buffer;
	openBox: (
		cipherBytes: Buffer,
		nonceBytes: Buffer,
		convertedPublicKey: Buffer,
		convertedPrivateKey: Buffer,
	) => Buffer;
	signDetached: (messageBytes: Buffer, privateKeyBytes: Buffer) => Buffer;
	verifyDetached: (messageBytes: Buffer, signatureBytes: Buffer, publicKeyBytes: Buffer) => boolean;
}
