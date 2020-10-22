import { RawBlockHeader } from '@liskhq/lisk-chain';
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
import { Application, BlockHeaderJSON, RegisteredSchema } from 'lisk-framework';
import { ReportMisbehaviorPlugin } from '../../src';
import { encodeBlockHeaders } from '../../src/db';
import {
	closeApplication,
	createApplication,
	getReportMisbehaviorPlugin,
	publishEvent,
	waitTill,
} from '../utils/application';

// const encodeUpdatedBlock = (
// 	schemas: RegisteredSchema,
// 	updatedBlockHeader: Record<string, unknown>,
// ): string => {
// 	const encodedBlockHeader = codec.encode(schemas.blockHeader, updatedBlockHeader);
// 	const payload: Buffer[] = [];
// 	return codec.encode(schemas.block, { header: encodedBlockHeader, payload }).toString('hex');
// };

const getBlockHeaderWithoutId = (schemas: RegisteredSchema, encodedBlockBuffer: Buffer): Record<string, unknown> => {
	const { id, ...blockHeaderWithoutId } = codec.decode<RawBlockHeader>(schemas.blockHeader, encodedBlockBuffer);
	return blockHeaderWithoutId as unknown as Record<string, unknown>;
}

describe('save new block', () => {
	let app: Application;
	let codecSpy: jest.SpyInstance;
	let pluginDBGetSpy: jest.SpyInstance;
	let pluginDBPutSpy: jest.SpyInstance;
	let dbKey: string;
	let blockHeaderJSON: BlockHeaderJSON;
	let pluginInstance: ReportMisbehaviorPlugin;
	// const randomSignature =
	// 	'0c70c0ed6ca16312c6acab46dd8b801fd3f3a2bd68018651c2792b40a7d1d3ee276a6bafb6b4185637edfa4d282e18362e135c5e2cf0c68002bfd58307ddb30b';
	const encodedBlock =
		'0acd01080210c38ec1fc0518a2012220c736b8cfb669ff453118230c71d7dc433797b5b30da6b9d89a14457f1b56faa12a20e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85532209bcf519c9e0a8e66b3939f9d592b5a1728141ea3253b7d3a2424a44575c5f4e738004216087410001a1060fce85c0ca51ca1c72c589c9f651f574a40396edc8e940c5f5829d382c10cae3c2f7f24a5a9bb42ef8c545439e1a2e83951f87bc894816d7b90958b411a37b816c9e2d597dd52d7847d5a73f411ded65303';
	const encodedBlockBuffer = Buffer.from(encodedBlock, 'hex');

	beforeEach(async () => {
		app = await createApplication('reportMisbehavior');
		pluginInstance = getReportMisbehaviorPlugin(app);
		codecSpy = jest.spyOn(codec, 'decode');
		pluginDBGetSpy = jest.spyOn(pluginInstance['_pluginDB'], 'get');
		pluginDBPutSpy = jest.spyOn(pluginInstance['_pluginDB'], 'put');
		blockHeaderJSON = pluginInstance.codec.decodeBlock(encodedBlock).header;
		dbKey = `${blockHeaderJSON.generatorPublicKey}:${formatInt(blockHeaderJSON.height)}`;
	});

	afterEach(() => {
		codecSpy.mockClear();
		pluginDBPutSpy.mockClear();
		pluginDBGetSpy.mockClear();
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	it.only('should save block header by generator publicKey and height', async () => {
		// Arrange
		const blockHeaderObject = getBlockHeaderWithoutId(pluginInstance.schemas, encodedBlockBuffer);
		// Act
		publishEvent(app, encodedBlock);
		await waitTill(100);

		// Assert
		expect(codecSpy).toHaveBeenCalledWith(pluginInstance.schemas.block, encodedBlockBuffer);
		expect(pluginDBGetSpy).toHaveBeenCalledWith(dbKey);
		expect(pluginDBPutSpy).toHaveBeenCalledWith(dbKey, encodeBlockHeaders([], blockHeaderObject));
	});

	// it('should save block header by generator publicKey with same height', async () => {
	// 	// Arrange
	// 	encodedBlockHeaders = encodeBlockHeaders([], blockHeaderObject);

	// 	// Act
	// 	publishEvent(app, encodedBlock);
	// 	await waitTill(200);

	// 	// Assert
	// 	expect(codecSpy).toHaveBeenCalledWith(encodedBlock);
	// 	expect(pluginDBGetSpy).toHaveBeenCalledWith(dbKey);
	// 	expect(pluginDBPutSpy).toHaveBeenCalledWith(dbKey, encodedBlockHeaders);

	// 	// Arrange & Act
	// 	const { blockHeaders } = await getBlockHeaders(pluginInstance['_pluginDB'], dbKey);
	// 	const updatedBlockHeader = getBlockHeaderObject(pluginInstance.schemas, {
	// 		...blockHeaderJSON,
	// 		signature: randomSignature,
	// 	});
	// 	const newEncodedBlock = encodeUpdatedBlock(pluginInstance.schemas, updatedBlockHeader);
	// 	publishEvent(app, newEncodedBlock);
	// 	await waitTill(200);
	// 	encodedBlockHeaders = encodeBlockHeaders(blockHeaders, updatedBlockHeader);

	// 	// Assert
	// 	expect(codecSpy).toHaveBeenCalledWith(newEncodedBlock);
	// 	expect(pluginDBGetSpy).toHaveBeenCalledWith(dbKey);
	// 	expect(pluginDBPutSpy).toHaveBeenCalledWith(dbKey, encodedBlockHeaders);
	// });

	// it('should save block headers by same generator publicKey with different height', async () => {
	// 	// Arrange
	// 	const updatedBlockHeader = getBlockHeaderObject(pluginInstance.schemas, {
	// 		...blockHeaderJSON,
	// 		height: blockHeaderJSON.height + 1,
	// 	});
	// 	const newEncodedBlock = encodeUpdatedBlock(pluginInstance.schemas, updatedBlockHeader);
	// 	pluginInstance.codec.decodeBlock(newEncodedBlock);
	// 	const newDbKey = `${blockHeaderJSON.generatorPublicKey}:${blockHeaderJSON.height + 1}`;
	// 	// Act
	// 	publishEvent(app, newEncodedBlock);
	// 	await waitTill(200);

	// 	// Assert
	// 	expect(codecSpy).toHaveBeenCalledWith(newEncodedBlock);
	// 	expect(pluginDBGetSpy).toHaveBeenCalledWith(newDbKey);
	// 	expect(pluginDBPutSpy).toHaveBeenCalledWith(
	// 		newDbKey,
	// 		encodeBlockHeaders([], updatedBlockHeader),
	// 	);
	// });
});
