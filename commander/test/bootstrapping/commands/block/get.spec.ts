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
import { BaseIPCClientCommand } from '../../../../src/bootstrapping/commands/base_ipc_client';
import * as appUtils from '../../../../src/utils/application';
import { GetCommand } from '../../../../src/bootstrapping/commands/block/get';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';

describe('block:get command', () => {
	const blockSchema = {
		$id: 'blockSchema',
		type: 'object',
		properties: {
			header: { dataType: 'bytes', fieldNumber: 1 },
			transactions: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 2 },
			assets: {
				type: 'array',
				items: {
					dataType: 'bytes',
				},
				fieldNumber: 3,
			},
		},
	};
	const blockHeaderSchema = {
		$id: '/block/header/signing/3',
		type: 'object',
		properties: {
			version: { dataType: 'uint32', fieldNumber: 1 },
			timestamp: { dataType: 'uint32', fieldNumber: 2 },
			height: { dataType: 'uint32', fieldNumber: 3 },
			previousBlockID: { dataType: 'bytes', fieldNumber: 4 },
			generatorAddress: { dataType: 'bytes', fieldNumber: 5 },
			transactionRoot: { dataType: 'bytes', fieldNumber: 6 },
			assetRoot: { dataType: 'bytes', fieldNumber: 7 },
			eventRoot: { dataType: 'bytes', fieldNumber: 8 },
			stateRoot: { dataType: 'bytes', fieldNumber: 9 },
			maxHeightPrevoted: { dataType: 'uint32', fieldNumber: 10 },
			maxHeightGenerated: { dataType: 'uint32', fieldNumber: 11 },
			validatorsHash: { dataType: 'bytes', fieldNumber: 12 },
			aggregateCommit: {
				type: 'object',
				fieldNumber: 13,
				required: ['height', 'aggregationBits', 'certificateSignature'],
				properties: {
					height: {
						dataType: 'uint32',
						fieldNumber: 1,
					},
					aggregationBits: {
						dataType: 'bytes',
						fieldNumber: 2,
					},
					certificateSignature: {
						dataType: 'bytes',
						fieldNumber: 3,
					},
				},
			},
			signature: { dataType: 'bytes', fieldNumber: 14 },
		},
		required: [
			'version',
			'timestamp',
			'height',
			'previousBlockID',
			'generatorAddress',
			'transactionRoot',
			'assetRoot',
			'eventRoot',
			'stateRoot',
			'maxHeightPrevoted',
			'maxHeightGenerated',
			'validatorsHash',
			'aggregateCommit',
		],
	};

	const blockId = '4f7e41f5744c0c2a434f13afb186b77fb4b176a5298f91ed866680ff5ef13a6d';
	const blockDataAtHeightTwo = {
		header: {
			generatorAddress: 'a9a3c363a71a3089566352127cf0e6f79d3834e1d67b4132b98d35afd3b85375',
			height: 2,
			id: '085d7c9b7bddc8052be9eefe185f407682a495f1b4498677df1480026b74f2e9',
			previousBlockID: '4f7e41f5744c0c2a434f13afb186b77fb4b176a5298f91ed866680ff5ef13a6d',
			signature:
				'5aa36d00cbcd135b55484c17ba89da8ecbac4df2ccc2c0c12b9db0cf4e48c74122c6c8d5100cf83fa83f79d5684eccf2ef9e6c55408bac9dea45c2b5aa590a0c',
			timestamp: 1592924699,
			transactionRoot: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
			maxHeightGenerated: 0,
			maxHeightPrevoted: 0,
			version: 2,
		},
		transactions: [],
	};

	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;
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
		getMock = jest.fn().mockResolvedValue(blockDataAtHeightTwo);
		getByHeightMock = jest.fn().mockResolvedValue(blockDataAtHeightTwo);
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
			disconnect: jest.fn(),
			schemas: {
				block: blockSchema,
				blockHeader: blockHeaderSchema,
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
