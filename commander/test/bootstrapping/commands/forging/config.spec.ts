/*
 * Copyright © 2021 Lisk Foundation
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
import * as fs from 'fs-extra';
import * as Config from '@oclif/config';
import * as cryptography from '@liskhq/lisk-cryptography';

import { ConfigCommand } from '../../../../src/bootstrapping/commands/forging/config';
import { getConfig } from '../../../helpers/config';
import * as readerUtils from '../../../../src/utils/reader';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

describe('forging:config command', () => {
	const address = '67f7c759b8533acf4f25b6892dbda04323507b32';
	const encryptedPassphraseString =
		'salt=683425ca06c9ff88a5ab292bb5066dc5&cipherText=4ce151&iv=bfaeef79a466e370e210f3c6&tag=e84bf097b1ec5ae428dd7ed3b4cce522&version=1';
	const defaultKeys = {
		publicKey: Buffer.from(
			'337600533a1f734c84b738d5f634c284a80ecc8b92bae4f30c1f22f8fd001e6a',
			'hex',
		),
	};
	const encryptedPassphraseObject = {
		salt: 'salt',
		cipherText: 'cipherText',
		iv: 'iv',
		tag: 'tag',
		version: '1',
	};
	const defaultInputs = {
		passphrase: 'enemy pill squeeze gold spoil aisle awake thumb congress false box wagon',
		password: 'LbYpLpV9Wpec6ux8',
	};
	const consoleWarnSpy = jest.spyOn(console, 'warn');

	let stdout: string[];
	let stderr: string[];
	let config: Config.IConfig;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(ConfigCommand.prototype, 'printJSON').mockReturnValue();
		jest.spyOn(cryptography, 'getKeys').mockReturnValue(defaultKeys as never);
		jest.spyOn(fs, 'ensureDirSync').mockReturnValue();
		jest.spyOn(fs, 'writeJSONSync').mockReturnValue();
		jest
			.spyOn(cryptography, 'encryptPassphraseWithPassword')
			.mockReturnValue(encryptedPassphraseObject);
		jest
			.spyOn(cryptography, 'stringifyEncryptedPassphrase')
			.mockReturnValue(encryptedPassphraseString);
		jest.spyOn(readerUtils, 'getPassphraseFromPrompt').mockImplementation(async (name?: string) => {
			if (name === 'passphrase') {
				return defaultInputs.passphrase;
			}
			return '';
		});
		jest.spyOn(readerUtils, 'getPasswordFromPrompt').mockImplementation(async (name?: string) => {
			if (name === 'password') {
				return defaultInputs.password;
			}
			return '';
		});
	});

	describe('forging:config', () => {
		describe('generate forging config and print', () => {
			it('should encrypt passphrase and with default hash-onions', async () => {
				await ConfigCommand.run(['--count=2', '--distance=1', '--pretty'], config);
				expect(cryptography.encryptPassphraseWithPassword).toHaveBeenCalledWith(
					defaultInputs.passphrase,
					defaultInputs.password,
				);
				expect(cryptography.stringifyEncryptedPassphrase).toHaveBeenCalledWith(
					encryptedPassphraseObject,
				);
				expect(readerUtils.getPassphraseFromPrompt).toHaveBeenCalledWith('passphrase', true);
				expect(readerUtils.getPasswordFromPrompt).toHaveBeenCalledWith('password', true);

				expect(ConfigCommand.prototype.printJSON).toHaveBeenCalledWith(
					{
						address,
						encryptedPassphrase: encryptedPassphraseString,
						hashOnion: {
							count: 2,
							distance: 1,
							hashes: expect.anything(),
						},
					},
					true,
				);
				expect(consoleWarnSpy).toHaveBeenCalledTimes(0);
			});

			it('should encrypt passphrase from passphrase and password flags', async () => {
				await ConfigCommand.run(
					[
						'--passphrase=enemy pill squeeze gold spoil aisle awake thumb congress false box wagon',
						'--password=LbYpLpV9Wpec6ux8',
						'--count=2',
						'--distance=1',
						'--pretty',
					],
					config,
				);
				expect(cryptography.encryptPassphraseWithPassword).toHaveBeenCalledWith(
					defaultInputs.passphrase,
					defaultInputs.password,
				);
				expect(cryptography.stringifyEncryptedPassphrase).toHaveBeenCalledWith(
					encryptedPassphraseObject,
				);
				expect(readerUtils.getPassphraseFromPrompt).not.toHaveBeenCalledWith('passphrase', true);
				expect(readerUtils.getPasswordFromPrompt).not.toHaveBeenCalledWith('password', true);
				expect(ConfigCommand.prototype.printJSON).toHaveBeenCalledWith(
					{
						address,
						encryptedPassphrase: encryptedPassphraseString,
						hashOnion: {
							count: 2,
							distance: 1,
							hashes: expect.anything(),
						},
					},
					true,
				);
			});
		});

		describe('generate forging config and save', () => {
			it('should write forging config to file', async () => {
				await ConfigCommand.run(
					['--count=2', '--distance=1', '--output=/tmp/forging_config.json'],
					config,
				);
				expect(fs.ensureDirSync).toHaveBeenCalledWith('/tmp');
				expect(fs.writeJSONSync).toHaveBeenCalledWith(
					'/tmp/forging_config.json',
					expect.anything(),
				);
			});

			it('should write forging config to file in pretty format', async () => {
				await ConfigCommand.run(
					['--count=2', '--distance=1', '--pretty', '--output=/tmp/forging_config.json'],
					config,
				);
				expect(fs.ensureDirSync).toHaveBeenCalledWith('/tmp');
				expect(fs.writeJSONSync).toHaveBeenCalledWith(
					'/tmp/forging_config.json',
					expect.anything(),
					{ spaces: ' ' },
				);
			});
		});
	});
});
