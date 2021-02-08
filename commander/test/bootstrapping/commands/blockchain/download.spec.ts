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
import * as Config from '@oclif/config';
import * as downloadUtils from '../../../../src/utils/download';
import { DownloadCommand } from '../../../../src/bootstrapping/commands/blockchain/download';
import { getConfig } from '../../../helpers/config';

describe('blockchain:download', () => {
	const SNAPSHOT_URL = 'https://downloads.lisk.io/lisk/mainnet/blockchain.db.tar.gz';
	const dataPath = process.cwd();

	let stdout: string[];
	let stderr: string[];
	let config: Config.IConfig;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(downloadUtils, 'downloadAndValidate').mockResolvedValue(undefined);
		jest.spyOn(downloadUtils, 'getChecksum').mockResolvedValue('checksum' as never);
	});

	describe('when downloading without flags', () => {
		it('should call downloadAndValidate', async () => {
			await DownloadCommand.run([], config);
			expect(downloadUtils.downloadAndValidate).toHaveBeenCalledWith(SNAPSHOT_URL, dataPath);
		});
	});

	describe('when downloading with network flag', () => {
		it('should call downloadAndValidate', async () => {
			await DownloadCommand.run(['--network=betanet'], config);
			expect(downloadUtils.downloadAndValidate).toHaveBeenCalledWith(
				SNAPSHOT_URL.replace('mainnet', 'betanet'),
				dataPath,
			);
		});
	});

	describe('when downloading with output flag', () => {
		it('should call downloadAndValidate', async () => {
			await DownloadCommand.run(['--output=yourpath'], config);
			expect(downloadUtils.downloadAndValidate).toHaveBeenCalledWith(SNAPSHOT_URL, 'yourpath');
		});
	});

	describe('when downloading with url flag', () => {
		it('should call downloadAndValidate', async () => {
			await DownloadCommand.run(['--url=yoururl'], config);
			expect(downloadUtils.downloadAndValidate).toHaveBeenCalledWith('yoururl', dataPath);
		});
	});
});
