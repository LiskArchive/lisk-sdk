/*
 * LiskHQ/lisk-commander
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
import * as cryptography from '@liskhq/lisk-cryptography';

interface EncryptMessageInputs {
	readonly message: string;
	readonly passphrase: string;
	readonly recipient: string;
}

export const encryptMessage = ({
	message,
	passphrase,
	recipient,
}: EncryptMessageInputs) =>
	cryptography.encryptMessageWithPassphrase(message, passphrase, recipient);

interface DecryptMessageInputs {
	readonly cipher: string;
	readonly nonce: string;
	readonly passphrase: string;
	readonly senderPublicKey: string;
}

export const decryptMessage = ({
	cipher,
	nonce,
	passphrase,
	senderPublicKey,
}: DecryptMessageInputs) => ({
	message: cryptography.decryptMessageWithPassphrase(
		cipher,
		nonce,
		passphrase,
		senderPublicKey,
	),
});

interface EncryptPassphraseInputs {
	readonly passphrase: string;
	readonly password: string;
}

export const encryptPassphrase = ({
	passphrase,
	password,
}: EncryptPassphraseInputs) => {
	const encryptedPassphraseObject = cryptography.encryptPassphraseWithPassword(
		passphrase,
		password,
	);
	const encryptedPassphrase = cryptography.stringifyEncryptedPassphrase(
		encryptedPassphraseObject,
	);

	return { encryptedPassphrase };
};

interface DecryptPassphraseInput {
	readonly encryptedPassphrase: string;
	readonly password: string;
}

export const decryptPassphrase = ({
	encryptedPassphrase,
	password,
}: DecryptPassphraseInput) => {
	const encryptedPassphraseObject = cryptography.parseEncryptedPassphrase(
		encryptedPassphrase,
	);
	const passphrase = cryptography.decryptPassphraseWithPassword(
		encryptedPassphraseObject,
		password,
	);

	return { passphrase };
};

export const { getKeys } = cryptography;

export const getAddressFromPublicKey = (
	publicKey: string,
): { readonly address: string } => ({
	address: cryptography.getAddressFromPublicKey(publicKey),
});

interface SignMessageInputs {
	readonly message: string;
	readonly passphrase: string;
}

export const signMessage = ({ message, passphrase }: SignMessageInputs) =>
	cryptography.signMessageWithPassphrase(message, passphrase);

interface VerifyMessageInputs {
	readonly message: string;
	readonly publicKey: string;
	readonly signature: string;
}

export const verifyMessage = ({
	publicKey,
	signature,
	message,
}: VerifyMessageInputs) => ({
	verified: cryptography.verifyMessageWithPublicKey({
		publicKey,
		signature,
		message,
	}),
});
