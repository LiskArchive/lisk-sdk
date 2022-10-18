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
import { homedir } from 'os';
import * as path from 'path';
import { getBlockchainDBPath, getStateDBPath } from '../../../../src/utils/path';
import * as downloadUtils from '../../../../src/utils/download';
import { ImportCommand } from '../../../../src/bootstrapping/commands/blockchain/import';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';

describe('blockchain:import', () => {
	const defaultDataPath = path.join(homedir(), '.lisk', 'lisk-core');
	const defaultBlockchainDBPath = getBlockchainDBPath(defaultDataPath);
	const defaultStateDBPath = getStateDBPath(defaultDataPath);
	const defaultOutputPath = path.join(defaultDataPath, 'data');
	const pathToBlockchainGzip = '/path/to/blockchain.db.tar.gz';
	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(fs, 'existsSync').mockReturnValue(false);
		jest.spyOn(fs, 'removeSync').mockReturnValue();
		jest.spyOn(fs, 'ensureDirSync').mockReturnValue();
		jest.spyOn(path, 'extname').mockReturnValue('.gz');
		jest.spyOn(downloadUtils, 'extract').mockReturnValue('' as never);
	});

	describe('when importing with no path argument', () => {
		it('should log error and return', async () => {
			await expect(ImportCommand.run([], config)).rejects.toThrow('Missing 1 required arg:');
		});
	});

	describe('when importing with no existing blockchain data', () => {
		it('should import "blockchain.db" from given path', async () => {
			await ImportCommand.run([pathToBlockchainGzip], config);
			expect(fs.existsSync).toHaveBeenCalledTimes(2);
			expect(fs.existsSync).toHaveBeenCalledWith(defaultBlockchainDBPath);
			expect(fs.existsSync).toHaveBeenCalledWith(defaultStateDBPath);
			expect(fs.ensureDirSync).toHaveBeenCalledTimes(1);
			expect(fs.ensureDirSync).toHaveBeenCalledWith(defaultOutputPath);
			expect(downloadUtils.extract).toHaveBeenCalledTimes(1);
			expect(downloadUtils.extract).toHaveBeenCalledWith(
				path.dirname(pathToBlockchainGzip),
				'blockchain.db.tar.gz',
				defaultOutputPath,
			);
		});
	});

	describe('when importing with --data-path flag', () => {
		const dataPath = '/my/app/';
		const blockchainDBPath = getBlockchainDBPath(dataPath);
		const stateDBPath = getStateDBPath(dataPath);
		const outputPath = path.join(dataPath, 'data');
		it('should import "blockchain.db" from given path', async () => {
			await ImportCommand.run([pathToBlockchainGzip, '--data-path=/my/app/'], config);
			expect(fs.existsSync).toHaveBeenCalledTimes(2);
			expect(fs.existsSync).toHaveBeenCalledWith(blockchainDBPath);
			expect(fs.existsSync).toHaveBeenCalledWith(stateDBPath);
			expect(fs.ensureDirSync).toHaveBeenCalledTimes(1);
			expect(fs.ensureDirSync).toHaveBeenCalledWith(outputPath);
			expect(downloadUtils.extract).toHaveBeenCalledTimes(1);
			expect(downloadUtils.extract).toHaveBeenCalledWith(
				path.dirname(pathToBlockchainGzip),
				'blockchain.db.tar.gz',
				outputPath,
			);
		});
	});

	describe('when importing with existing blockchain data', () => {
		beforeEach(() => {
			(fs.existsSync as jest.Mock).mockReturnValue(true);
		});

		describe('when importing without --force flag', () => {
			it('should log error and return', async () => {
				await expect(ImportCommand.run([pathToBlockchainGzip], config)).rejects.toThrow(
					`There is already a blockchain data file found at ${defaultDataPath}. Use --force to override.`,
				);
			});
		});

		describe('when importing with --force flag', () => {
			it('should import "blockchain.db" to given data-path', async () => {
				await ImportCommand.run([pathToBlockchainGzip, '--force'], config);
				expect(fs.existsSync).toHaveBeenCalledTimes(2);
				expect(fs.existsSync).toHaveBeenCalledWith(defaultBlockchainDBPath);
				expect(fs.existsSync).toHaveBeenCalledWith(defaultStateDBPath);
				expect(fs.ensureDirSync).toHaveBeenCalledTimes(1);
				expect(fs.ensureDirSync).toHaveBeenCalledWith(defaultOutputPath);
				expect(downloadUtils.extract).toHaveBeenCalledTimes(1);
				expect(downloadUtils.extract).toHaveBeenCalledWith(
					path.dirname(pathToBlockchainGzip),
					'blockchain.db.tar.gz',
					defaultOutputPath,
				);
			});
		});
	});
});
