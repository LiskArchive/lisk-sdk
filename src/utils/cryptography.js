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

const liskCrypto = elements.cryptography;

export const encryptMessage = ({ message, passphrase, recipient }) =>
	liskCrypto.encryptMessageWithPassphrase(message, passphrase, recipient);

export const decryptMessage = ({
	cipher,
	nonce,
	passphrase,
	senderPublicKey,
}) => ({
	message: liskCrypto.decryptMessageWithPassphrase(
		cipher,
		nonce,
		passphrase,
		senderPublicKey,
	),
});

export const encryptPassphrase = ({ passphrase, password }) => {
	const encryptedPassphraseObject = liskCrypto.encryptPassphraseWithPassword(
		passphrase,
		password,
	);
	const encryptedPassphrase = liskCrypto.stringifyEncryptedPassphrase(
		encryptedPassphraseObject,
	);
	return { encryptedPassphrase };
};

export const decryptPassphrase = ({ encryptedPassphrase, password }) => {
	const encryptedPassphraseObject = liskCrypto.parseEncryptedPassphrase(
		encryptedPassphrase,
	);
	const passphrase = liskCrypto.decryptPassphraseWithPassword(
		encryptedPassphraseObject,
		password,
	);
	return { passphrase };
};

export const getKeys = passphrase => liskCrypto.getKeys(passphrase);

export const getAddressFromPublicKey = publicKey => ({
	address: liskCrypto.getAddressFromPublicKey(publicKey),
});

export const signMessage = ({ message, passphrase }) =>
	liskCrypto.signMessageWithPassphrase(message, passphrase);

export const verifyMessage = ({ publicKey, signature, message }) => ({
	verified: liskCrypto.verifyMessageWithPublicKey({
		publicKey,
		signature,
		message,
	}),
});
