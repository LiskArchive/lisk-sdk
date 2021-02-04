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
import * as apiClient from '@liskhq/lisk-api-client';
import * as Config from '@oclif/config';
import { BaseIPCClientCommand } from '../../../../src/bootstrapping/commands/base_ipc_client';
import * as appUtils from '../../../../src/utils/application';
import { GetCommand } from '../../../../src/bootstrapping/commands/block/get';
import { getConfig } from '../../../helpers/config';

describe('block:get command', () => {
	const blockSchema = {
		$id: 'blockSchema',
		type: 'object',
		properties: {
			header: { dataType: 'bytes', fieldNumber: 1 },
			payload: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 2 },
		},
	};
	const blockHeaderSchema = {
		$id: 'blockHeaderSchema',
		type: 'object',
		properties: {
			version: { dataType: 'uint32', fieldNumber: 1 },
			timestamp: { dataType: 'uint32', fieldNumber: 2 },
			height: { dataType: 'uint32', fieldNumber: 3 },
			previousBlockID: { dataType: 'bytes', fieldNumber: 4 },
			transactionRoot: { dataType: 'bytes', fieldNumber: 5 },
			generatorPublicKey: { dataType: 'bytes', fieldNumber: 6 },
			reward: { dataType: 'uint64', fieldNumber: 7 },
			asset: { dataType: 'bytes', fieldNumber: 8 },
			signature: { dataType: 'bytes', fieldNumber: 9 },
		},
	};
	const blockHeadersAssets = {
		2: {
			$id: '/block-header/asset/v2',
			type: 'object',
			properties: {
				maxHeightPreviouslyForged: { dataType: 'uint32', fieldNumber: 1 },
				maxHeightPrevoted: { dataType: 'uint32', fieldNumber: 2 },
				seedReveal: { dataType: 'bytes', fieldNumber: 3 },
			},
		},
	};

	const blockId = '4f7e41f5744c0c2a434f13afb186b77fb4b176a5298f91ed866680ff5ef13a6d';
	const blockDataAtHeightTwo = {
		header: {
			asset: {
				maxHeightPreviouslyForged: 0,
				maxHeightPrevoted: 0,
				seedReveal: '8903ea6e67ccd67bafa1c9c04184a387',
			},
			generatorPublicKey: 'a9a3c363a71a3089566352127cf0e6f79d3834e1d67b4132b98d35afd3b85375',
			height: 2,
			id: '085d7c9b7bddc8052be9eefe185f407682a495f1b4498677df1480026b74f2e9',
			previousBlockID: '4f7e41f5744c0c2a434f13afb186b77fb4b176a5298f91ed866680ff5ef13a6d',
			reward: '0',
			signature:
				'5aa36d00cbcd135b55484c17ba89da8ecbac4df2ccc2c0c12b9db0cf4e48c74122c6c8d5100cf83fa83f79d5684eccf2ef9e6c55408bac9dea45c2b5aa590a0c',
			timestamp: 1592924699,
			transactionRoot: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
			version: 2,
		},
		payload: [],
	};
	const encodedBlockData =
		'0acc010802109bb4c8f705180222204f7e41f5744c0c2a434f13afb186b77fb4b176a5298f91ed866680ff5ef13a6d2a20e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8553220a9a3c363a71a3089566352127cf0e6f79d3834e1d67b4132b98d35afd3b8537538004216080010001a108903ea6e67ccd67bafa1c9c04184a3874a405aa36d00cbcd135b55484c17ba89da8ecbac4df2ccc2c0c12b9db0cf4e48c74122c6c8d5100cf83fa83f79d5684eccf2ef9e6c55408bac9dea45c2b5aa590a0c';

	let stdout: string[];
	let stderr: string[];
	let config: Config.IConfig;
	let getMock: jest.Mock;
	let getByHeightMock: jest.Mock;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(true);
		jest.spyOn(fs, 'existsSync').mockReturnValue(true);
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		getMock = jest.fn().mockResolvedValue(encodedBlockData);
		getByHeightMock = jest.fn().mockResolvedValue(encodedBlockData);
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
			disconnect: jest.fn(),
			schemas: {
				block: blockSchema,
				blockHeader: blockHeaderSchema,
				blockHeadersAssets,
			},
			block: {
				get: getMock,
				getByHeight: getByHeightMock,
				toJSON: jest.fn().mockReturnValue(blockDataAtHeightTwo),
			},
		} as never);
		jest.spyOn(BaseIPCClientCommand.prototype, 'printJSON');
	});

	describe('block:get', () => {
		it('should throw an error when no arguments are provided.', async () => {
			await expect(GetCommand.run([], config)).rejects.toThrow('Missing 1 required arg:');
		});
	});

	describe('block:get by height', () => {
		it('should get block info at height 2 and display as an object', async () => {
			await GetCommand.run(['2'], config);
			expect(getByHeightMock).toHaveBeenCalledWith(2);
			expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenCalledTimes(1);
			expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenCalledWith(blockDataAtHeightTwo);
		});
	});

	describe('block:get by id', () => {
		it('should get block info for the given id and display as an object', async () => {
			await GetCommand.run([blockId], config);
			expect(getMock).toHaveBeenCalledTimes(1);
			expect(getMock).toHaveBeenCalledWith(Buffer.from(blockId, 'hex'));
			expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenCalledTimes(1);
			expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenCalledWith(blockDataAtHeightTwo);
		});
	});
});
