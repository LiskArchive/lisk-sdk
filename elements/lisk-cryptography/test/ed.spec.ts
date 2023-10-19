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
import { makeInvalid } from './helpers';
import {
	signMessageWithPrivateKey,
	verifyMessageWithPublicKey,
	printSignedMessage,
	signAndPrintMessage,
	signDataWithPrivateKey,
	verifyData,
	getPrivateKeyFromPhraseAndPath,
	getPublicKeyFromPrivateKey,
} from '../src/ed';
import { createMessageTag } from '../src/utils';
import { MAX_UINT32 } from '../src/constants';

const changeLength = (buffer: Buffer): Buffer => Buffer.concat([Buffer.from('00', 'hex'), buffer]);

const privateKey = Buffer.from(
	'314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588',
	'hex',
);
const publicKey = Buffer.from(
	'7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588',
	'hex',
);

const tag = createMessageTag('TST');

describe('sign and verify message', () => {
	const message = 'Some default text.';
	const messageBuffer = Buffer.from(message, 'utf8');
	const { signature } = signMessageWithPrivateKey(message, privateKey);
	const { signature: signatureCustomTag } = signMessageWithPrivateKey(message, privateKey, tag);
	const printedMessage = `
-----BEGIN LISK SIGNED MESSAGE-----
-----MESSAGE-----
${message}
-----PUBLIC KEY-----
${publicKey.toString('hex')}
-----SIGNATURE-----
${signature.toString('hex')}
-----END LISK SIGNED MESSAGE-----
`.trim();

	describe('#signMessageWithPrivateKey', () => {
		it('should create a signed message using a private key', () => {
			const signedStringMessage = signMessageWithPrivateKey(message, privateKey);
			expect(signedStringMessage).toMatchSnapshot();

			const signedBufferMessage = signMessageWithPrivateKey(messageBuffer, privateKey);
			expect(signedBufferMessage.signature).toEqual(signedStringMessage.signature);
		});

		it('should create a signed message using a private key and a custom tag', () => {
			const signedMessage = signMessageWithPrivateKey(message, privateKey, tag);
			expect(signedMessage).toMatchSnapshot();
		});
	});

	describe('#verifyMessageWithPublicKey', () => {
		it('should detect invalid publicKeys', () => {
			expect(() =>
				verifyMessageWithPublicKey({ message, signature, publicKey: changeLength(publicKey) }),
			).toThrow('Invalid publicKey, expected 32-byte publicKey');
		});

		it('should detect invalid signatures', () => {
			expect(() =>
				verifyMessageWithPublicKey({ message, signature: changeLength(signature), publicKey }),
			).toThrow('Invalid signature length, expected 64-byte signature');
		});

		it('should return false if the signature is invalid', () => {
			const verification = verifyMessageWithPublicKey({
				message,
				signature: makeInvalid(signature),
				publicKey,
			});
			expect(verification).toBeFalse();
		});

		it('should return true if the signature is valid and message is in string format', () => {
			const signedMessage = { message, publicKey, signature };
			expect(verifyMessageWithPublicKey(signedMessage)).toBeTrue();
		});

		it('should return true if the signature is valid and message is in Buffer format', () => {
			const signedMessage = { message: messageBuffer, publicKey, signature };
			expect(verifyMessageWithPublicKey(signedMessage)).toBeTrue();
		});

		it('should return true if the signature is valid and a custom tag is used', () => {
			const signedMessage = { message, publicKey, signature: signatureCustomTag, tag };
			expect(verifyMessageWithPublicKey(signedMessage)).toBeTrue();
		});
	});

	describe('#printSignedMessage', () => {
		it('should wrap a single signed message into a printed Lisk template', () => {
			const generatedPrintedMessage = printSignedMessage({ message, signature, publicKey });
			expect(generatedPrintedMessage).toBe(printedMessage);
		});
	});

	describe('#signAndPrintMessage', () => {
		it('should sign the message once and wrap it into a printed Lisk template', () => {
			const signedAndPrintedMessage = signAndPrintMessage(message, privateKey);
			expect(signedAndPrintedMessage).toBe(printedMessage);
		});
	});
});

describe('sign and verify data', () => {
	const chainID = Buffer.from('10000000', 'hex');

	const data = Buffer.from('This is some data');
	const signature = signDataWithPrivateKey(tag, chainID, data, privateKey);

	describe('#signDataWithPrivateKey', () => {
		it('should sign data', () => {
			expect(signDataWithPrivateKey(tag, chainID, data, privateKey)).toMatchSnapshot();
		});
	});

	describe('#verifyData', () => {
		it('should return false for an invalid signature', () => {
			const verification = verifyData(tag, chainID, data, makeInvalid(signature), publicKey);
			expect(verification).toBeFalse();
		});

		it('should return true for a valid signature', () => {
			const verification = verifyData(tag, chainID, data, signature, publicKey);
			expect(verification).toBeTrue();
		});
	});
});

describe('getPrivateKeyFromPhraseAndPath', () => {
	const passphrase =
		'target cancel solution recipe vague faint bomb convince pink vendor fresh patrol';

	it('should get keypair from valid phrase and path', async () => {
		const privateKeyFromPassphrase = await getPrivateKeyFromPhraseAndPath(
			passphrase,
			`m/44'/134'/0'`,
		);
		const publicKeyFromPrivateKey = getPublicKeyFromPrivateKey(privateKeyFromPassphrase);
		expect(publicKeyFromPrivateKey.toString('hex')).toBe(
			'c6bae83af23540096ac58d5121b00f33be6f02f05df785766725acdd5d48be9d',
		);
		expect(privateKeyFromPassphrase.toString('hex')).toBe(
			'c465dfb15018d3aef0d94d411df048e240e87a3ec9cd6d422cea903bfc101f61c6bae83af23540096ac58d5121b00f33be6f02f05df785766725acdd5d48be9d',
		);
	});

	it('should derive distinct keys from same valid phrase but distinct paths', async () => {
		const privateKeyFromPassphrase = await getPrivateKeyFromPhraseAndPath(
			passphrase,
			`m/44'/134'/0'`,
		);

		const anotherPrivateKeyFromPassphrase = await getPrivateKeyFromPhraseAndPath(
			passphrase,
			`m/44'/134'/1'`,
		);

		expect(privateKeyFromPassphrase).not.toEqual(anotherPrivateKeyFromPassphrase);
	});

	it('should fail for empty string path', async () => {
		await expect(getPrivateKeyFromPhraseAndPath(passphrase, '')).rejects.toThrow(
			'Invalid path format',
		);
	});

	it('should fail if path does not start with "m"', async () => {
		await expect(getPrivateKeyFromPhraseAndPath(passphrase, `/44'/134'/0'`)).rejects.toThrow(
			'Invalid path format',
		);
	});

	it('should fail if path does not include at least one "/"', async () => {
		await expect(getPrivateKeyFromPhraseAndPath(passphrase, 'm441340')).rejects.toThrow(
			'Invalid path format',
		);
	});

	it('should fail for path with invalid segment', async () => {
		await expect(
			getPrivateKeyFromPhraseAndPath(
				passphrase,
				`m//134'/0'`, // should be number with or without ' between every back slash
			),
		).rejects.toThrow('Invalid path format');
	});

	it('should fail for path with invalid characters', async () => {
		await expect(getPrivateKeyFromPhraseAndPath(passphrase, `m/a'/134b'/0'`)).rejects.toThrow(
			'Invalid path format',
		);
	});

	it('should fail for path with non-sanctioned special characters', async () => {
		await expect(getPrivateKeyFromPhraseAndPath(passphrase, `m/4a'/#134b'/0'`)).rejects.toThrow(
			'Invalid path format',
		);
	});

	it(`should fail for path with segment greater than ${MAX_UINT32} / 2`, async () => {
		await expect(
			getPrivateKeyFromPhraseAndPath(passphrase, `m/44'/134'/${MAX_UINT32}'`),
		).rejects.toThrow('Invalid path format');
	});
});
