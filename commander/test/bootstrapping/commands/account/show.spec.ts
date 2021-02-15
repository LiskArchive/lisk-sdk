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
import * as Config from '@oclif/config';
import * as readerUtils from '../../../../src/utils/reader';
import { ShowCommand } from '../../../../src/bootstrapping/commands/account/show';
import { getConfig } from '../../../helpers/config';

describe('account:show', () => {
	const passphraseInput =
		'whale acoustic sword work scene frame assume ensure hawk federal upgrade angry';
	const secondDefaultMnemonic =
		'alone cabin buffalo blast region upper jealous basket brush put answer twice';

	let stdout: string[];
	let stderr: string[];
	let config: Config.IConfig;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(readerUtils, 'getPassphraseFromPrompt').mockResolvedValue(passphraseInput);
		config = await getConfig();
	});

	describe('account:show', () => {
		it('should show account with prompt', async () => {
			await ShowCommand.run([], config);
			expect(readerUtils.getPassphraseFromPrompt).toHaveBeenCalledWith('passphrase', true);
			expect(JSON.parse(stdout[0])).toEqual({
				privateKey: cryptography.getKeys(passphraseInput).privateKey.toString('hex'),
				publicKey: cryptography.getKeys(passphraseInput).publicKey.toString('hex'),
				address: cryptography.getBase32AddressFromPublicKey(
					cryptography.getKeys(passphraseInput).publicKey,
					'lsk',
				),
				binaryAddress: cryptography.getAddressFromPassphrase(passphraseInput).toString('hex'),
			});
		});

		it('should show account with pass', async () => {
			await ShowCommand.run(['--passphrase', secondDefaultMnemonic], config);
			expect(readerUtils.getPassphraseFromPrompt).not.toHaveBeenCalled();
			expect(JSON.parse(stdout[0])).toEqual({
				privateKey: cryptography.getKeys(secondDefaultMnemonic).privateKey.toString('hex'),
				publicKey: cryptography.getKeys(secondDefaultMnemonic).publicKey.toString('hex'),
				address: cryptography.getBase32AddressFromPublicKey(
					cryptography.getKeys(secondDefaultMnemonic).publicKey,
					'lsk',
				),
				binaryAddress: cryptography.getAddressFromPassphrase(secondDefaultMnemonic).toString('hex'),
			});
		});
	});
});
