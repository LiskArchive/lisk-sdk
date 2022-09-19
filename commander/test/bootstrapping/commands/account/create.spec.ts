/*
 * LiskHQ/lisk-commander
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
import * as cryptography from '@liskhq/lisk-cryptography';
import * as passphrase from '@liskhq/lisk-passphrase';

import { CreateCommand } from '../../../../src/bootstrapping/commands/account/create';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';

describe('account:create', () => {
	const defaultMnemonic =
		'lab mirror fetch tuna village sell sphere truly excite manual planet capable';
	const secondDefaultMnemonic =
		'alone cabin buffalo blast region upper jealous basket brush put answer twice';
	const blsPrivateKey = cryptography.bls.generatePrivateKey(Buffer.from(defaultMnemonic, 'utf-8'));
	const secondBlsPrivateKey = cryptography.bls.generatePrivateKey(
		Buffer.from(secondDefaultMnemonic, 'utf-8'),
	);
	let results: any;
	let config: Awaited<ReturnType<typeof getConfig>>;

	beforeEach(async () => {
		results = [];
		jest
			.spyOn(passphrase.Mnemonic, 'generateMnemonic')
			.mockReturnValueOnce(defaultMnemonic)
			.mockReturnValueOnce(secondDefaultMnemonic);
		jest.spyOn(process.stdout, 'write').mockImplementation(val => results.push(val));
		config = await getConfig();
	});

	describe('account:create', () => {
		it('should create an account', async () => {
			await CreateCommand.run([], config);
			expect(JSON.parse(results[0])).toEqual([
				{
					publicKey: cryptography.legacy.getKeys(defaultMnemonic).publicKey.toString('hex'),
					privateKey: cryptography.legacy.getKeys(defaultMnemonic).privateKey.toString('hex'),
					blsPublicKey: cryptography.bls.getPublicKeyFromPrivateKey(blsPrivateKey).toString('hex'),
					blsPrivateKey: blsPrivateKey.toString('hex'),
					address: cryptography.address.getLisk32AddressFromPublicKey(
						cryptography.legacy.getKeys(defaultMnemonic).publicKey,
						'lsk',
					),
					passphrase: defaultMnemonic,
				},
			]);
		});
	});

	describe('account:create --count=x', () => {
		const defaultNumber = 2;
		it('should create multiple accounts', async () => {
			await CreateCommand.run(['--count', defaultNumber.toString()], config);
			const result = [
				{
					publicKey: cryptography.legacy.getKeys(defaultMnemonic).publicKey.toString('hex'),
					privateKey: cryptography.legacy.getKeys(defaultMnemonic).privateKey.toString('hex'),
					blsPublicKey: cryptography.bls.getPublicKeyFromPrivateKey(blsPrivateKey).toString('hex'),
					blsPrivateKey: blsPrivateKey.toString('hex'),
					address: cryptography.address.getLisk32AddressFromPublicKey(
						cryptography.legacy.getKeys(defaultMnemonic).publicKey,
						'lsk',
					),
					passphrase: defaultMnemonic,
				},
				{
					publicKey: cryptography.legacy.getKeys(secondDefaultMnemonic).publicKey.toString('hex'),
					privateKey: cryptography.legacy.getKeys(secondDefaultMnemonic).privateKey.toString('hex'),
					blsPublicKey: cryptography.bls
						.getPublicKeyFromPrivateKey(secondBlsPrivateKey)
						.toString('hex'),
					blsPrivateKey: secondBlsPrivateKey.toString('hex'),
					address: cryptography.address.getLisk32AddressFromPublicKey(
						cryptography.legacy.getKeys(secondDefaultMnemonic).publicKey,
						'lsk',
					),
					passphrase: secondDefaultMnemonic,
				},
			];
			expect(JSON.parse(results[0])).toEqual(result);
		});

		it('should throw an error if the flag is invalid number', async () => {
			await expect(CreateCommand.run(['--count=NaN'], config)).rejects.toThrow(
				'Count flag must be an integer and greater than 0',
			);
		});

		it('should throw an error if the Count flag is less than 1', async () => {
			await expect(CreateCommand.run(['--count=0'], config)).rejects.toThrow(
				'Count flag must be an integer and greater than 0',
			);
		});

		it('should throw an error if the Count flag contains non-number characters', async () => {
			await expect(CreateCommand.run(['--count=10sk24'], config)).rejects.toThrow(
				'Count flag must be an integer and greater than 0',
			);
		});
	});
});
