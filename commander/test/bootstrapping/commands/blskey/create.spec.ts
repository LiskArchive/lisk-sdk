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
import * as Config from '@oclif/config';
import * as readerUtils from '../../../../src/utils/reader';
import { CreateCommand } from '../../../../src/bootstrapping/commands/blskey/create';
import { getConfig } from '../../../helpers/config';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

describe('passphrase:encrypt', () => {
	const defaultPassphrase =
		'enemy pill squeeze gold spoil aisle awake thumb congress false box wagon';
	const defaultBlsPrivateKey = cryptography.generatePrivateKey(
		Buffer.from(defaultPassphrase, 'utf-8'),
	);
	const defaultBlsPublicKey = cryptography.getPublicKeyFromPrivateKey(defaultBlsPrivateKey);
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
		jest.spyOn(CreateCommand.prototype, 'printJSON').mockReturnValue();
		jest.spyOn(cryptography, 'generatePrivateKey');
		jest.spyOn(cryptography, 'getPublicKeyFromPrivateKey');
		jest.spyOn(readerUtils, 'getPassphraseFromPrompt').mockImplementation(async (name?: string) => {
			if (name === 'passphrase') {
				return defaultPassphrase;
			}
			return '';
		});
	});

	describe('blskey:create', () => {
		it('should create valid bls keys', async () => {
			await CreateCommand.run([], config);
			expect(cryptography.generatePrivateKey).toHaveBeenCalledWith(
				Buffer.from(defaultPassphrase, 'utf-8'),
			);
			expect(cryptography.getPublicKeyFromPrivateKey).toHaveBeenCalledWith(defaultBlsPrivateKey);
			expect(readerUtils.getPassphraseFromPrompt).toHaveBeenCalledWith('passphrase', true);

			expect(CreateCommand.prototype.printJSON).toHaveBeenCalledWith(
				{
					blsPrivateKey: defaultBlsPrivateKey.toString('hex'),
					blsPublicKey: defaultBlsPublicKey.toString('hex'),
				},
				undefined,
			);
			expect(consoleWarnSpy).toHaveBeenCalledTimes(0);
		});
	});

	describe('blskey:create --passphrase="enemy pill squeeze gold spoil aisle awake thumb congress false box wagon"', () => {
		it('should create valid bls keys', async () => {
			await CreateCommand.run(
				['--passphrase=enemy pill squeeze gold spoil aisle awake thumb congress false box wagon'],
				config,
			);
			expect(cryptography.generatePrivateKey).toHaveBeenCalledWith(
				Buffer.from(defaultPassphrase, 'utf-8'),
			);
			expect(cryptography.getPublicKeyFromPrivateKey).toHaveBeenCalledWith(defaultBlsPrivateKey);
			expect(readerUtils.getPassphraseFromPrompt).not.toHaveBeenCalledWith('passphrase', true);

			expect(CreateCommand.prototype.printJSON).toHaveBeenCalledWith(
				{
					blsPrivateKey: defaultBlsPrivateKey.toString('hex'),
					blsPublicKey: defaultBlsPublicKey.toString('hex'),
				},
				undefined,
			);
		});
	});
});
