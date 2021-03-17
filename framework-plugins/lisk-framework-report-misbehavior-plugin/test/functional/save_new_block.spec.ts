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
 */

import { codec } from '@liskhq/lisk-codec';
import { formatInt } from '@liskhq/lisk-db';
import { BlockHeader, RawBlock } from '@liskhq/lisk-chain';
import {
	KeysModule,
	SequenceModule,
	testing,
	TokenModule,
	RegisteredSchema,
	DPoSModule,
} from 'lisk-framework';
import { rmdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { ReportMisbehaviorPlugin } from '../../src';
import { blockHeadersSchema, getBlockHeaders } from '../../src/db';
import { getReportMisbehaviorPlugin, publishEvent, waitTill, config } from '../utils/application';

describe('save block header', () => {
	let appEnv: testing.ApplicationEnv;
	let codecSpy: jest.SpyInstance;
	let pluginDBGetSpy: jest.SpyInstance;
	let pluginDBPutSpy: jest.SpyInstance;
	let dbKey: string;
	let blockHeader: BlockHeader;
	let pluginInstance: ReportMisbehaviorPlugin;
	const randomPublicKey = 'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd';
	const randomSignature =
		'0c70c0ed6ca16312c6acab46dd8b801fd3f3a2bd68018651c2792b40a7d1d3ee276a6bafb6b4185637edfa4d282e18362e135c5e2cf0c68002bfd58307ddb30b';
	const encodedBlock =
		'0acd01080210c38ec1fc0518a2012220c736b8cfb669ff453118230c71d7dc433797b5b30da6b9d89a14457f1b56faa12a20e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85532209bcf519c9e0a8e66b3939f9d592b5a1728141ea3253b7d3a2424a44575c5f4e738004216087410001a1060fce85c0ca51ca1c72c589c9f651f574a40396edc8e940c5f5829d382c10cae3c2f7f24a5a9bb42ef8c545439e1a2e83951f87bc894816d7b90958b411a37b816c9e2d597dd52d7847d5a73f411ded65303';
	const encodedBlockBuffer = Buffer.from(encodedBlock, 'hex');
	const encodeBlockHeaders = (blockHeaders: Buffer[], newHeader: Buffer) =>
		codec.encode(blockHeadersSchema, {
			blockHeaders: [...blockHeaders, newHeader],
		});
	const appLabel = 'report-misbehavior-plugin';
	const dataPath = join(homedir(), '.lisk', appLabel);

	const encodeBlockHeader = (schemas: RegisteredSchema, newHeader: BlockHeader) =>
		codec.encode(schemas.blockHeader, newHeader);

	beforeAll(async () => {
		if (existsSync(dataPath)) {
			rmdirSync(dataPath, { recursive: true });
		}
		const modules = [TokenModule, SequenceModule, KeysModule, DPoSModule];
		const { genesisBlockJSON } = testing.fixtures.createGenesisBlockWithAccounts(modules);
		config.label = 'reportMisbehavior';
		appEnv = new testing.ApplicationEnv({
			modules,
			config,
			plugins: [ReportMisbehaviorPlugin],
			genesisBlock: genesisBlockJSON,
		});
		await appEnv.startApplication();
		pluginInstance = getReportMisbehaviorPlugin(appEnv.application);
		const { header } = codec.decode<RawBlock>(pluginInstance.schemas.block, encodedBlockBuffer);
		blockHeader = codec.decode(pluginInstance.schemas.blockHeader, header);
		dbKey = `${blockHeader.generatorPublicKey.toString('binary')}:${formatInt(blockHeader.height)}`;
	});

	beforeEach(() => {
		codecSpy = jest.spyOn(codec, 'decode');
		pluginDBGetSpy = jest.spyOn(pluginInstance['_pluginDB'], 'get');
		pluginDBPutSpy = jest.spyOn(pluginInstance['_pluginDB'], 'put');
	});

	afterAll(async () => {
		const options: { clearDB: boolean } = { clearDB: true };
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		await appEnv.stopApplication(options);
	});

	describe('from same generator', () => {
		it('should save block header by height', async () => {
			// Act
			publishEvent(appEnv.application, encodedBlock);
			await waitTill(100);

			// Assert
			expect(codecSpy).toHaveBeenCalledWith(pluginInstance.schemas.block, encodedBlockBuffer);
			expect(pluginDBGetSpy).toHaveBeenCalledWith(dbKey);
			expect(pluginDBPutSpy).toHaveBeenCalledWith(
				dbKey,
				encodeBlockHeaders([], encodeBlockHeader(pluginInstance.schemas, blockHeader)),
			);
		});

		it('should save block headers with different height', async () => {
			// Arrange
			const updatedBlockHeader = { ...blockHeader, height: blockHeader.height + 1 };
			dbKey = `${updatedBlockHeader.generatorPublicKey.toString('binary')}:${formatInt(
				updatedBlockHeader.height,
			)}`;
			const newBlockHeader = encodeBlockHeader(pluginInstance.schemas, updatedBlockHeader);
			const newEncodedBlock = codec.encode(pluginInstance.schemas.block, {
				header: newBlockHeader,
				payload: [],
			});
			// Act
			publishEvent(appEnv.application, newEncodedBlock.toString('hex'));
			await waitTill(200);

			// Assert
			expect(codecSpy).toHaveBeenCalledWith(pluginInstance.schemas.block, newEncodedBlock);
			expect(pluginDBGetSpy).toHaveBeenCalledWith(dbKey);
			expect(pluginDBPutSpy).toHaveBeenCalledWith(dbKey, encodeBlockHeaders([], newBlockHeader));
		});

		it('should save different block header with same height', async () => {
			// Arrange
			const modifiedBlockHeader = {
				...blockHeader,
				signature: Buffer.from(randomSignature, 'hex'),
			};
			dbKey = `${modifiedBlockHeader.generatorPublicKey.toString('binary')}:${formatInt(
				modifiedBlockHeader.height,
			)}`;
			const newBlockHeader = encodeBlockHeader(pluginInstance.schemas, modifiedBlockHeader);
			const blockBuff = codec.encode(pluginInstance.schemas.block, {
				header: newBlockHeader,
				payload: [],
			});
			const { blockHeaders } = await getBlockHeaders(pluginInstance['_pluginDB'], dbKey);

			// Act
			publishEvent(appEnv.application, blockBuff.toString('hex'));
			await waitTill(200);

			// Assert
			expect(codecSpy).toHaveBeenCalledWith(pluginInstance.schemas.block, blockBuff);
			expect(pluginDBGetSpy).toHaveBeenCalledWith(dbKey);
			expect(pluginDBPutSpy).toHaveBeenCalledWith(
				dbKey,
				encodeBlockHeaders(blockHeaders, newBlockHeader),
			);
			const result = await getBlockHeaders(pluginInstance['_pluginDB'], dbKey);
			expect(result.blockHeaders).toHaveLength(2);
		});
	});

	describe('from different generator', () => {
		it('should save block headers by publicKey and height', async () => {
			// Arrange
			const updatedBlockHeader = {
				...blockHeader,
				generatorPublicKey: Buffer.from(randomPublicKey, 'hex'),
			};
			dbKey = `${updatedBlockHeader.generatorPublicKey.toString('binary')}:${formatInt(
				updatedBlockHeader.height,
			)}`;
			const newBlockHeader = encodeBlockHeader(pluginInstance.schemas, updatedBlockHeader);
			const newEncodedBlock = codec.encode(pluginInstance.schemas.block, {
				header: newBlockHeader,
				payload: [],
			});
			// Act
			publishEvent(appEnv.application, newEncodedBlock.toString('hex'));
			await waitTill(200);

			// Assert
			expect(codecSpy).toHaveBeenCalledWith(pluginInstance.schemas.block, newEncodedBlock);
			expect(pluginDBGetSpy).toHaveBeenCalledWith(dbKey);
			expect(pluginDBPutSpy).toHaveBeenCalledWith(dbKey, encodeBlockHeaders([], newBlockHeader));
			const { blockHeaders } = await getBlockHeaders(pluginInstance['_pluginDB'], dbKey);
			expect(blockHeaders).toHaveLength(1);
		});
	});
});
