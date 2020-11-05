/*
 * Copyright © 2020 Lisk Foundation
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

import {
	blockHeaderSchema,
	blockSchema,
	blockHeaderAssetSchema,
	transactionSchema,
} from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { Channel } from '../../src/types';
import { Block } from '../../src/block';

describe('block', () => {
	let channel: Channel;
	let block: Block;

	const encodedBlock =
		'0acd01080210c38ec1fc0518a2012220c736b8cfb669ff453118230c71d7dc433797b5b30da6b9d89a14457f1b56faa12a20e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85532209bcf519c9e0a8e66b3939f9d592b5a1728141ea3253b7d3a2424a44575c5f4e738004216087410001a1060fce85c0ca51ca1c72c589c9f651f574a40396edc8e940c5f5829d382c10cae3c2f7f24a5a9bb42ef8c545439e1a2e83951f87bc894816d7b90958b411a37b816c9e2d597dd52d7847d5a73f411ded65303';
	const encodedBlockBuffer = Buffer.from(encodedBlock, 'hex');

	const blockId = '4f7e41f5744c0c2a434f13afb186b77fb4b176a5298f91ed866680ff5ef13a6d';
	const id = Buffer.from(blockId, 'hex');
	const accountSchema = {
		$id: 'accountSchema',
		type: 'object',
		properties: {
			sequence: {
				type: 'object',
				fieldNumber: 3,
				properties: {
					nonce: {
						fieldNumber: 1,
						dataType: 'uint64',
					},
				},
			},
		},
	};
	const schema = {
		account: accountSchema,
		block: blockSchema,
		blockHeader: blockHeaderSchema,
		blockHeadersAssets: {
			2: blockHeaderAssetSchema,
		},
		transaction: transactionSchema,
		transactionAssets: [
			{
				moduleID: 5,
				moduleName: 'dpos',
				assetID: 3,
				assetName: 'reportDelegateMisbehavior',
				schema: {
					$id: 'lisk/dpos/pom',
					type: 'object',
					required: ['header1', 'header2'],
					properties: {
						header1: {
							...blockHeaderSchema,
							fieldNumber: 1,
						},
						header2: {
							...blockHeaderSchema,
							fieldNumber: 2,
						},
					},
				},
			},
		],
	} as any;

	const { header, payload } = codec.decode(schema.block, encodedBlockBuffer);
	const blockHeader = codec.decode(schema.blockHeader, header);
	const sampleBlock = { blockHeader, payload };

	beforeEach(() => {
		channel = {
			connect: jest.fn(),
			disconnect: jest.fn(),
			invoke: jest.fn().mockResolvedValue(encodedBlock),
			subscribe: jest.fn(),
		};
		block = new Block(channel, schema);
	});

	describe('Block', () => {
		describe('constructor', () => {
			it('should initialize with channel', () => {
				expect(block['_channel']).toBe(channel);
			});
		});

		describe('get', () => {
			it('should invoke app:getBlockByID', async () => {
				// Act
				await block.get(id);

				// Assert
				expect(channel.invoke).toHaveBeenCalledTimes(1);
				expect(channel.invoke).toHaveBeenCalledWith('app:getBlockByID', { id: blockId });
			});
		});

		describe('getByHeight', () => {
			it('should invoke app:getBlockByHeight', async () => {
				// Act
				await block.getByHeight(1);

				// Assert
				expect(channel.invoke).toHaveBeenCalledTimes(1);
				expect(channel.invoke).toHaveBeenCalledWith('app:getBlockByHeight');
			});
		});

		describe('encode', () => {
			it('should return encoded block', () => {
				// Act
				const _encodedBlock = block.encode(sampleBlock as any);

				// Assert
				expect(_encodedBlock).toEqual(encodedBlock);
			});
		});

		describe('decode', () => {
			it('should return decoded block', () => {
				// Act
				const decodedBlock = block.decode(encodedBlockBuffer);

				// Assert
				expect(decodedBlock).toEqual(encodedBlock);
			});
		});
	});
});
