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

import { Readable } from 'stream';
import * as crypto from 'crypto';
import { homedir } from 'os';
import { join } from 'path';
import * as appUtils from '../../../../src/utils/application';
import * as dbUtils from '../../../../src/utils/db';
import { HashCommand } from '../../../../src/bootstrapping/commands/blockchain/hash';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';

const defaultDataPath = join(homedir(), '.lisk', 'lisk-core');

describe('blockchain:hash', () => {
	const pid = 56869;
	const hashBuffer = Buffer.from('dasfadsfdsaf787899afffadsfadsf');

	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;
	let hashStub: { update: any; digest: any };

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		hashStub = {
			update: jest.fn(),
			digest: jest.fn().mockReturnValue(hashBuffer),
		};
		jest.spyOn(crypto, 'createHash').mockReturnValue(hashStub as never);
		jest.spyOn(dbUtils, 'getBlockchainDB').mockReturnValue({
			createReadStream: jest.fn().mockReturnValue(Readable.from([hashBuffer])),
		} as never);
		jest.spyOn(appUtils, 'getPid').mockReturnValue(pid);
	});

	describe('when application is running', () => {
		describe('when starting without flag', () => {
			it('should log error and return', async () => {
				jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(true);
				await expect(HashCommand.run([], config)).rejects.toThrow(
					`Can't generate hash for a running application. Application at data path ${defaultDataPath} is running with pid ${pid}.`,
				);
			});
		});

		describe('when starting with particular data-path', () => {
			it('should log error and return', async () => {
				jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(true);
				await expect(HashCommand.run(['--data-path=/my/app/'], config)).rejects.toThrow(
					`Can't generate hash for a running application. Application at data path /my/app/ is running with pid ${pid}.`,
				);
			});
		});
	});

	describe('when application is not running', () => {
		describe('when starting without flag', () => {
			it('should create db object for "blockchain.db" for default data path', async () => {
				jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(false);
				await HashCommand.run([], config);
				expect(dbUtils.getBlockchainDB).toHaveBeenCalledTimes(1);
				expect(dbUtils.getBlockchainDB).toHaveBeenCalledWith(defaultDataPath);
			});

			it('should hash the value read from db stream', async () => {
				jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(false);
				await HashCommand.run([], config);
				expect(crypto.createHash).toHaveBeenCalledTimes(1);
				expect(crypto.createHash).toHaveBeenCalledWith('sha256');
				expect(hashStub.update).toHaveBeenCalledTimes(1);
				expect(hashStub.update).toHaveBeenCalledWith(hashBuffer);
				expect(hashStub.digest).toHaveBeenCalledTimes(1);
			});

			it('should output the hash db values', async () => {
				jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(false);
				await HashCommand.run([], config);
				expect(stdout[0]).toBe(`${hashBuffer.toString('hex')}\n`);
			});
		});

		describe('when starting with particular data-path', () => {
			it('should create db object for "blockchain.db" for given data path', async () => {
				jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(false);
				await HashCommand.run(['--data-path=/my/app/'], config);
				expect(dbUtils.getBlockchainDB).toHaveBeenCalledTimes(1);
				expect(dbUtils.getBlockchainDB).toHaveBeenCalledWith('/my/app/');
			});

			it('should hash the value read from db stream', async () => {
				jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(false);
				await HashCommand.run(['--data-path=/my/app/'], config);
				expect(crypto.createHash).toHaveBeenCalledTimes(1);
				expect(crypto.createHash).toHaveBeenCalledWith('sha256');
				expect(hashStub.update).toHaveBeenCalledTimes(1);
				expect(hashStub.update).toHaveBeenCalledWith(hashBuffer);
				expect(hashStub.digest).toHaveBeenCalledTimes(1);
			});

			it('should output the hash db values', async () => {
				jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(false);
				await HashCommand.run(['--data-path=/my/app/'], config);
				expect(stdout[0]).toBe(`${hashBuffer.toString('hex')}\n`);
			});
		});
	});
});
