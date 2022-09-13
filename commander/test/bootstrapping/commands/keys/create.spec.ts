/*
 * LiskHQ/lisk-commander
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

import * as cryptography from '@liskhq/lisk-cryptography';
import * as fs from 'fs-extra';
import * as readerUtils from '../../../../src/utils/reader';
import { CreateCommand } from '../../../../src/bootstrapping/commands/keys/create';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

describe('keys:create command', () => {
	const defaultPassphrase =
		'enemy pill squeeze gold spoil aisle awake thumb congress false box wagon';
	const defaultPassword = 'password';
	const defaultAccountKeyPath = `m/44'/134'/0'`;
	const defaultGeneratorKeyPath = `m/25519'/134'/0'/0'`;
	const defaultBlsKeyPath = `m/12381/134/0/0`;
	const consoleWarnSpy = jest.spyOn(console, 'warn');

	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;
	let defaultAccountPrivateKey: Buffer;
	let defaultAccountPublicKey: Buffer;
	let defaultAddress: Buffer;
	let defaultGeneratorPrivateKey: Buffer;
	let defaultGeneratorPublicKey: Buffer;
	let defaultBlsPrivateKey: Buffer;
	let defaultBlsPublicKey: Buffer;
	let defaultKeys: any;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();

		defaultAccountPrivateKey = await cryptography.ed.getKeyPairFromPhraseAndPath(
			defaultPassphrase,
			defaultAccountKeyPath,
		);
		defaultAccountPublicKey = cryptography.ed.getPublicKeyFromPrivateKey(defaultAccountPrivateKey);
		defaultAddress = cryptography.address.getAddressFromPublicKey(defaultAccountPublicKey);
		defaultGeneratorPrivateKey = await cryptography.ed.getKeyPairFromPhraseAndPath(
			defaultPassphrase,
			defaultGeneratorKeyPath,
		);
		defaultGeneratorPublicKey = cryptography.ed.getPublicKeyFromPrivateKey(
			defaultGeneratorPrivateKey,
		);
		defaultBlsPrivateKey = await cryptography.bls.getPrivateKeyFromPhraseAndPath(
			defaultPassphrase,
			defaultBlsKeyPath,
		);
		defaultBlsPublicKey = cryptography.bls.getPublicKeyFromPrivateKey(defaultBlsPrivateKey);
		defaultKeys = [
			{
				address: cryptography.address.getLisk32AddressFromAddress(defaultAddress),
				keyPath: defaultAccountKeyPath,
				publicKey: defaultAccountPublicKey.toString('hex'),
				privateKey: defaultAccountPrivateKey.toString('hex'),
				plain: {
					generatorKeyPath: defaultGeneratorKeyPath,
					generatorKey: defaultGeneratorPublicKey.toString('hex'),
					generatorPrivateKey: defaultGeneratorPrivateKey.toString('hex'),
					blsKeyPath: defaultBlsKeyPath,
					blsKey: defaultBlsPublicKey.toString('hex'),
					blsProofOfPosession: cryptography.bls.popProve(defaultBlsPrivateKey).toString('hex'),
					blsPrivateKey: defaultBlsPrivateKey.toString('hex'),
				},
			},
		];

		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(cryptography.ed, 'getKeyPairFromPhraseAndPath');
		jest.spyOn(cryptography.ed, 'getPublicKeyFromPrivateKey');
		jest.spyOn(cryptography.address, 'getAddressFromPublicKey');
		jest.spyOn(cryptography.bls, 'getPrivateKeyFromPhraseAndPath');
		jest.spyOn(cryptography.bls, 'getPublicKeyFromPrivateKey');
		jest.spyOn(fs, 'ensureDirSync').mockReturnValue();
		jest.spyOn(fs, 'writeJSONSync').mockReturnValue();
		jest.spyOn(readerUtils, 'getPassphraseFromPrompt').mockImplementation(async (name?: string) => {
			if (name === 'passphrase') {
				return defaultPassphrase;
			}
			return '';
		});
		jest.spyOn(readerUtils, 'getPasswordFromPrompt').mockImplementation(async (name?: string) => {
			if (name === 'password') {
				return defaultPassword;
			}
			return '';
		});
	});

	describe('keys:create', () => {
		it('should create valid keys', async () => {
			await CreateCommand.run([], config);
			const loggedData = JSON.parse(stdout[0]);

			expect(cryptography.ed.getKeyPairFromPhraseAndPath).toHaveBeenCalledWith(
				defaultPassphrase,
				defaultAccountKeyPath,
			);
			expect(cryptography.ed.getPublicKeyFromPrivateKey).toHaveBeenCalledWith(
				defaultAccountPrivateKey,
			);
			expect(cryptography.address.getAddressFromPublicKey).toHaveBeenCalledWith(
				defaultAccountPublicKey,
			);
			expect(cryptography.ed.getKeyPairFromPhraseAndPath).toHaveBeenCalledWith(
				defaultPassphrase,
				defaultGeneratorKeyPath,
			);
			expect(cryptography.ed.getPublicKeyFromPrivateKey).toHaveBeenCalledWith(
				defaultGeneratorPrivateKey,
			);
			expect(cryptography.bls.getPrivateKeyFromPhraseAndPath).toHaveBeenCalledWith(
				defaultPassphrase,
				defaultBlsKeyPath,
			);
			expect(cryptography.bls.getPublicKeyFromPrivateKey).toHaveBeenCalledWith(
				defaultBlsPrivateKey,
			);
			expect(readerUtils.getPassphraseFromPrompt).toHaveBeenCalledWith('passphrase', true);
			expect(readerUtils.getPasswordFromPrompt).toHaveBeenCalledWith('password', true);

			expect(loggedData).toMatchObject({
				keys: defaultKeys,
			});
			expect(loggedData.keys[0].encrypted).not.toBeUndefined();
			expect(loggedData.keys[0].encrypted).toHaveProperty('ciphertext');
			expect(loggedData.keys[0].encrypted).toHaveProperty('mac');
			expect(loggedData.keys[0].encrypted).toHaveProperty('cipherparams');
			expect(loggedData.keys[0].encrypted).toHaveProperty('kdfparams');
			expect(loggedData.keys[0].encrypted.cipher).toBe('aes-256-gcm');
			expect(loggedData.keys[0].encrypted.kdf).toBe('argon2id');
			expect(loggedData.keys[0].encrypted.version).toBe('1');
			expect(consoleWarnSpy).toHaveBeenCalledTimes(0);
		});
	});

	describe('keys:create --no-encrypt true', () => {
		it('should create valid keys', async () => {
			await CreateCommand.run(['--no-encrypt'], config);
			const loggedData = JSON.parse(stdout[0]);
			const expectedData = [{ ...defaultKeys[0], encrypted: {} }];

			expect(cryptography.ed.getKeyPairFromPhraseAndPath).toHaveBeenCalledWith(
				defaultPassphrase,
				defaultAccountKeyPath,
			);
			expect(cryptography.ed.getPublicKeyFromPrivateKey).toHaveBeenCalledWith(
				defaultAccountPrivateKey,
			);
			expect(cryptography.address.getAddressFromPublicKey).toHaveBeenCalledWith(
				defaultAccountPublicKey,
			);
			expect(cryptography.ed.getKeyPairFromPhraseAndPath).toHaveBeenCalledWith(
				defaultPassphrase,
				defaultGeneratorKeyPath,
			);
			expect(cryptography.ed.getPublicKeyFromPrivateKey).toHaveBeenCalledWith(
				defaultGeneratorPrivateKey,
			);
			expect(cryptography.bls.getPrivateKeyFromPhraseAndPath).toHaveBeenCalledWith(
				defaultPassphrase,
				defaultBlsKeyPath,
			);
			expect(cryptography.bls.getPublicKeyFromPrivateKey).toHaveBeenCalledWith(
				defaultBlsPrivateKey,
			);
			expect(readerUtils.getPassphraseFromPrompt).toHaveBeenCalledWith('passphrase', true);

			expect(loggedData).toEqual({
				keys: expectedData,
			});
			expect(consoleWarnSpy).toHaveBeenCalledTimes(0);
		});
	});

	describe('keys:create --passphrase="enemy pill squeeze gold spoil aisle awake thumb congress false box wagon" --no-encrypt false --password password --count 2 --offset 1 --chainid 1 --output /tmp/keys.json', () => {
		it('should create valid keys', async () => {
			const accountKeyPath1 = `m/44'/134'/1'`;
			const generatorKeyPath1 = `m/25519'/134'/1'/1'`;
			const blsKeyPath1 = `m/12381/134/1/1`;
			const accountKeyPath2 = `m/44'/134'/2'`;
			const generatorKeyPath2 = `m/25519'/134'/1'/2'`;
			const blsKeyPath2 = `m/12381/134/1/2`;

			const accountPrivateKey1 = await cryptography.ed.getKeyPairFromPhraseAndPath(
				defaultPassphrase,
				accountKeyPath1,
			);
			const accountPublicKey1 = cryptography.ed.getPublicKeyFromPrivateKey(accountPrivateKey1);
			const generatorPrivateKey1 = await cryptography.ed.getKeyPairFromPhraseAndPath(
				defaultPassphrase,
				generatorKeyPath1,
			);

			const blsPrivateKey1 = await cryptography.bls.getPrivateKeyFromPhraseAndPath(
				defaultPassphrase,
				blsKeyPath1,
			);

			const accountPrivateKey2 = await cryptography.ed.getKeyPairFromPhraseAndPath(
				defaultPassphrase,
				accountKeyPath2,
			);
			const accountPublicKey2 = cryptography.ed.getPublicKeyFromPrivateKey(accountPrivateKey2);

			const generatorPrivateKey2 = await cryptography.ed.getKeyPairFromPhraseAndPath(
				defaultPassphrase,
				generatorKeyPath2,
			);

			const blsPrivateKey2 = await cryptography.bls.getPrivateKeyFromPhraseAndPath(
				defaultPassphrase,
				blsKeyPath2,
			);

			await CreateCommand.run(
				[
					'--passphrase=enemy pill squeeze gold spoil aisle awake thumb congress false box wagon',
					'--password=password',
					'--count=2',
					'--offset=1',
					'--chainid=1',
					'--output=/tmp/keys.json',
				],
				config,
			);

			expect(cryptography.ed.getKeyPairFromPhraseAndPath).toHaveBeenCalledWith(
				defaultPassphrase,
				accountKeyPath1,
			);
			expect(cryptography.ed.getPublicKeyFromPrivateKey).toHaveBeenCalledWith(accountPrivateKey1);
			expect(cryptography.address.getAddressFromPublicKey).toHaveBeenCalledWith(accountPublicKey1);
			expect(cryptography.ed.getKeyPairFromPhraseAndPath).toHaveBeenCalledWith(
				defaultPassphrase,
				generatorKeyPath1,
			);
			expect(cryptography.ed.getPublicKeyFromPrivateKey).toHaveBeenCalledWith(generatorPrivateKey1);
			expect(cryptography.bls.getPrivateKeyFromPhraseAndPath).toHaveBeenCalledWith(
				defaultPassphrase,
				blsKeyPath1,
			);
			expect(cryptography.bls.getPublicKeyFromPrivateKey).toHaveBeenCalledWith(blsPrivateKey1);

			expect(cryptography.ed.getKeyPairFromPhraseAndPath).toHaveBeenCalledWith(
				defaultPassphrase,
				accountKeyPath2,
			);
			expect(cryptography.ed.getPublicKeyFromPrivateKey).toHaveBeenCalledWith(accountPrivateKey2);
			expect(cryptography.address.getAddressFromPublicKey).toHaveBeenCalledWith(accountPublicKey2);
			expect(cryptography.ed.getKeyPairFromPhraseAndPath).toHaveBeenCalledWith(
				defaultPassphrase,
				generatorKeyPath2,
			);
			expect(cryptography.ed.getPublicKeyFromPrivateKey).toHaveBeenCalledWith(generatorPrivateKey2);
			expect(cryptography.bls.getPrivateKeyFromPhraseAndPath).toHaveBeenCalledWith(
				defaultPassphrase,
				blsKeyPath2,
			);
			expect(cryptography.bls.getPublicKeyFromPrivateKey).toHaveBeenCalledWith(blsPrivateKey2);

			expect(fs.ensureDirSync).toHaveBeenCalledWith('/tmp');
			expect(fs.writeJSONSync).toHaveBeenCalledWith('/tmp/keys.json', expect.anything(), {
				spaces: ' ',
			});
		});
	});
});
