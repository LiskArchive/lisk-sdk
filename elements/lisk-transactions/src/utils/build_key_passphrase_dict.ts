import { getPrivateAndPublicKeyFromPassphrase } from '@liskhq/lisk-cryptography';

interface PublicKeyPassphraseDict {
	// tslint:disable-next-line: readonly-keyword
	[key: string]: {
		readonly privateKey: string;
		readonly publicKey: string;
		readonly passphrase: string;
	};
}

export const buildPublicKeyPassphraseDict = (passphrases: string[]) => {
	const publicKeyPassphrase: PublicKeyPassphraseDict = {};

	passphrases.forEach(aPassphrase => {
		const keys = getPrivateAndPublicKeyFromPassphrase(aPassphrase);
		if (!publicKeyPassphrase[keys.publicKey]) {
			publicKeyPassphrase[keys.publicKey] = {
				...keys,
				passphrase: aPassphrase,
			};
		}
	});

	return publicKeyPassphrase;
};
