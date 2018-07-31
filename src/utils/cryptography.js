/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import elements from 'lisk-elements';

export const encryptMessage = ({ message, passphrase, recipient }) =>
	elements.cryptography.encryptMessageWithPassphrase(
		message,
		passphrase,
		recipient,
	);

export const decryptMessage = ({
	cipher,
	nonce,
	passphrase,
	senderPublicKey,
}) => ({
	message: elements.cryptography.decryptMessageWithPassphrase(
		cipher,
		nonce,
		passphrase,
		senderPublicKey,
	),
});

export const encryptPassphrase = ({ passphrase, password }) => {
	const encryptedPassphraseObject = elements.cryptography.encryptPassphraseWithPassword(
		passphrase,
		password,
	);
	const encryptedPassphrase = elements.cryptography.stringifyEncryptedPassphrase(
		encryptedPassphraseObject,
	);
	return { encryptedPassphrase };
};

export const decryptPassphrase = ({ encryptedPassphrase, password }) => {
	const encryptedPassphraseObject = elements.cryptography.parseEncryptedPassphrase(
		encryptedPassphrase,
	);
	const passphrase = elements.cryptography.decryptPassphraseWithPassword(
		encryptedPassphraseObject,
		password,
	);
	return { passphrase };
};

export const getKeys = passphrase => elements.cryptography.getKeys(passphrase);

export const getAddressFromPublicKey = publicKey => ({
	address: elements.cryptography.getAddressFromPublicKey(publicKey),
});

export const signMessage = ({ message, passphrase }) =>
	elements.cryptography.signMessageWithPassphrase(message, passphrase);

export const verifyMessage = ({ publicKey, signature, message }) => ({
	verified: elements.cryptography.verifyMessageWithPublicKey({
		publicKey,
		signature,
		message,
	}),
});
