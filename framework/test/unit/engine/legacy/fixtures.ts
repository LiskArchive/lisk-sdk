/*
 * Copyright © 2022 Lisk Foundation
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

import { utils } from '@liskhq/lisk-cryptography';
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { encodeBlock } from '../../../../src/engine/legacy/codec';
import { LegacyBlockHeader, LegacyBlockWithID } from '../../../../src/engine/legacy/types';

// Version 2 blocks
export const blockFixtures = [
	{
		header: {
			version: 2,
			timestamp: 1629547600,
			height: 16270306,
			previousBlockID: Buffer.from(
				'325a457a2d1cfa155f0c935624d6fbc34cf4a032edb7aed973b288f72f9c4c20',
				'hex',
			),
			transactionRoot: Buffer.from(
				'1c463d1d51d2ac12bc15f0ea249ada124598c00eb997cec72d2b516bc6d1dc36',
				'hex',
			),
			generatorPublicKey: Buffer.from(
				'041719e4a0cf7043cd6433442d3ae1816413168c1111162b6c97324df5a2a11a',
				'hex',
			),
			reward: BigInt('100000000'),
			asset: Buffer.from('080010d587e1071a10fefc7e86e78680e7621c2276873e46f1', 'hex'),
			signature: Buffer.from(
				'fdd5643d95d4ce3d75f9ad3414722c3cd5207ae8336df6867f36585fec40b2437f25ef9a0530ef97cb4597fcaf08e7b318d2d4fb614cfb8f0ccfca2549281504',
				'hex',
			),
			id: Buffer.from('cdc6e6b5e7806e091fb343901ad78cff7f789924f10be424cae23fd0cd031577', 'hex'),
		},
		payload: [
			Buffer.from(
				'0805100118002080c2d72f2a20041719e4a0cf7043cd6433442d3ae1816413168c1111162b6c97324df5a2a11a32200a1e0a14573574811f0ef76c38ca2beb1b80767710e8d8651080e08d84ddcb013a4034bc549246f9d2035237b54dc83a1d807ffe802eeb17723d4c871b0b9e17358911c5c882b790715b87ef4cef24e5c72a917af36540a46c2cf42890665f28aa053a40062885c05186f8ef2e9397ec84562327059edb0dde5c9d9f18c92b090907289c1ba56c6ad2dc8a9ff95ab92c04b971536e1b9e4130158231729e023b2a75aa04',
				'hex',
			),
		],
	},
	{
		header: {
			version: 2,
			timestamp: 1629547610,
			height: 16270307,
			previousBlockID: Buffer.from(
				'cdc6e6b5e7806e091fb343901ad78cff7f789924f10be424cae23fd0cd031577',
				'hex',
			),
			transactionRoot: Buffer.from(
				'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				'hex',
			),
			generatorPublicKey: Buffer.from(
				'ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba',
				'hex',
			),
			reward: BigInt('100000000'),
			asset: Buffer.from('080010d587e1071a109b8569809992dfa9446e339542cb1541', 'hex'),
			signature: Buffer.from(
				'00f032d2d5f6d6d0464f29828f77c42a94759f5f0374c302753487b0fb6b86b623033e6952807961634c36b80a3dd603de5a1da361c4ebdb1eff65f6da908304',
				'hex',
			),
			id: Buffer.from('c1c9d110b584420fcff515b771190efb43bb5c7fe251b39f1e5eb54910d00924', 'hex'),
		},
		payload: [],
	},
	{
		header: {
			version: 2,
			timestamp: 1629547640,
			height: 16270308,
			previousBlockID: Buffer.from(
				'c1c9d110b584420fcff515b771190efb43bb5c7fe251b39f1e5eb54910d00924',
				'hex',
			),
			transactionRoot: Buffer.from(
				'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				'hex',
			),
			generatorPublicKey: Buffer.from(
				'253e674789632f72c98d47a650f1ca5ece0dbb82f591080471129d57ed88fb8a',
				'hex',
			),
			reward: BigInt('100000000'),
			asset: Buffer.from('080010d587e1071a10dc0292185e5979b2947aa255476e1e62', 'hex'),
			signature: Buffer.from(
				'b5be300d7f11ea3499decf46cb6772b336a03b7b16d0ff9791c056a8177bb7716dd8564ceea08e8ede2e9dbf452a04e9dbdaa5da72ca90c52bbfb607616c7b05',
				'hex',
			),
			id: Buffer.from('20ed2f17e0f8ff76bef651ca4a3b2fc4bf2370ac3bee3e61cc983f24f00b59e1', 'hex'),
		},
		payload: [],
	},
	{
		header: {
			version: 2,
			timestamp: 1629547660,
			height: 16270309,
			previousBlockID: Buffer.from(
				'20ed2f17e0f8ff76bef651ca4a3b2fc4bf2370ac3bee3e61cc983f24f00b59e1',
				'hex',
			),
			transactionRoot: Buffer.from(
				'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				'hex',
			),
			generatorPublicKey: Buffer.from(
				'b73fa499a7794c111fcd011cdc7dcc426341a28c6c2d6a32b8d7d028dcb8493f',
				'hex',
			),
			reward: BigInt('100000000'),
			asset: Buffer.from('080010d587e1071a10e6178a02c8b10c139284bf44ec6f8a1d', 'hex'),
			signature: Buffer.from(
				'05e7d45fc56b4d69721bd78658f857e204236da9da7773b3243fb567e2c3ac670c62f13c85d6562211bb278599924e490d3133326a337df61a2d7f9e4f027403',
				'hex',
			),
			id: Buffer.from('24d1906bbd37fd315841ce0d3792940b692eb2e090a3e710b5b9a264ae282599', 'hex'),
		},
		payload: [],
	},
	{
		header: {
			version: 2,
			timestamp: 1629547670,
			height: 16270310,
			previousBlockID: Buffer.from(
				'24d1906bbd37fd315841ce0d3792940b692eb2e090a3e710b5b9a264ae282599',
				'hex',
			),
			transactionRoot: Buffer.from(
				'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				'hex',
			),
			generatorPublicKey: Buffer.from(
				'393f73238941510379d930e674e21ca4c00ba30c0877cd3728b5bd5874588671',
				'hex',
			),
			reward: BigInt('100000000'),
			asset: Buffer.from('080010d587e1071a107c8fec58e94627a0680ef880ad183f7e', 'hex'),
			signature: Buffer.from(
				'f3e19dfd9cd55f26c769d62bcd0d3c8555738142f953f6dde7ad2d31f5e0b8314c7a6755ee4fd1b4f2f3439c3011ad3c773aadf51c77136051d99572ac15230d',
				'hex',
			),
			id: Buffer.from('72765615aed55344f52b6869d5ee1c540d4010a8d3999040c31bab9ff95cf5f2', 'hex'),
		},
		payload: [],
	},
	{
		header: {
			version: 2,
			timestamp: 1629547680,
			height: 16270311,
			previousBlockID: Buffer.from(
				'72765615aed55344f52b6869d5ee1c540d4010a8d3999040c31bab9ff95cf5f2',
				'hex',
			),
			transactionRoot: Buffer.from(
				'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				'hex',
			),
			generatorPublicKey: Buffer.from(
				'74e502675f9c13f7c29c3fc8ab9dfae0883a83caa679592e94504a32ae8b8f9c',
				'hex',
			),
			reward: BigInt('100000000'),
			asset: Buffer.from('080010d587e1071a10cc0c98221f4634cbf9c43c953434e969', 'hex'),
			signature: Buffer.from(
				'172077763138172ee5277200175acc8a519a23e93e18d14fade7a5549039070acbdb8c0bef3deea29015af31d11e9c5bd3b3d463f8a496bdc2f375ac0765d301',
				'hex',
			),
			id: Buffer.from('8a72c692af03356c6aa9377a45483382a7817176baf760960df5a6979d150489', 'hex'),
		},
		payload: [],
	},
	{
		header: {
			version: 2,
			timestamp: 1629547720,
			height: 16270312,
			previousBlockID: Buffer.from(
				'8a72c692af03356c6aa9377a45483382a7817176baf760960df5a6979d150489',
				'hex',
			),
			transactionRoot: Buffer.from(
				'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				'hex',
			),
			generatorPublicKey: Buffer.from(
				'5fc34084e977b3d2ec5c5451749c013f8a58697c7e4e5228aec3477125c4aeff',
				'hex',
			),
			reward: BigInt('100000000'),
			asset: Buffer.from('080010d587e1071a10869aef5d8da4725cc11db88220f20cbe', 'hex'),
			signature: Buffer.from(
				'192b4072028ac29ce530d62c20a0a545ec21243ce2915778be62f571f2b372a27f61a7d0c9d54ed5762cf2f056bfdaa21339720ab423c702183bd5d7d6f95100',
				'hex',
			),
			id: Buffer.from('6df7e0c9575d05522d38b7ac931cc9e9ad396d42b5bf72d69de347ac229c904b', 'hex'),
		},
		payload: [],
	},
	{
		header: {
			version: 2,
			timestamp: 1629547760,
			height: 16270313,
			previousBlockID: Buffer.from(
				'6df7e0c9575d05522d38b7ac931cc9e9ad396d42b5bf72d69de347ac229c904b',
				'hex',
			),
			transactionRoot: Buffer.from(
				'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				'hex',
			),
			generatorPublicKey: Buffer.from(
				'db4b4db208667f9266e8a4d7fad9d8b2e711891175a21ee5f5f2cd088d1d8083',
				'hex',
			),
			reward: BigInt('100000000'),
			asset: Buffer.from('080010d587e1071a10e1a227940da7331050a28ea38d1e9665', 'hex'),
			signature: Buffer.from(
				'b4f89990a3516ad61899fbaa738ce8522577d6d620a92bddd679af08cd841a2a0f7a386dd99226fb807fa5008ac7a795c435411dfae9c47703324f71cdd34a06',
				'hex',
			),
			id: Buffer.from('7b4b7978971ad7f592bf4ff0a4b8e91d19196b17a5a768e70b50ef37e6c10447', 'hex'),
		},
		payload: [],
	},
	{
		header: {
			version: 2,
			timestamp: 1629547810,
			height: 16270314,
			previousBlockID: Buffer.from(
				'7b4b7978971ad7f592bf4ff0a4b8e91d19196b17a5a768e70b50ef37e6c10447',
				'hex',
			),
			transactionRoot: Buffer.from(
				'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				'hex',
			),
			generatorPublicKey: Buffer.from(
				'613e4178a65c1194192eaa29910f0ecca3737f92587dd05d58c6435da41220f6',
				'hex',
			),
			reward: BigInt('100000000'),
			asset: Buffer.from('080010d587e1071a10e35e0902668314769007ff1a70a30669', 'hex'),
			signature: Buffer.from(
				'4f5d83879b6676ea52511a39279482e8a23ac4a812530cf5fd9c41169b8d6feaca6e7737062873347ba6481896dcf51a8b4e3e28a14dbd6711099d0ce9c70e0f',
				'hex',
			),
			id: Buffer.from('3172b315801db6cd53f19c082fe5ff5bb5e16b7590cf80e78a64d4eb9ffcdb78', 'hex'),
		},
		payload: [],
	},
	{
		header: {
			version: 2,
			timestamp: 1629547840,
			height: 16270315,
			previousBlockID: Buffer.from(
				'3172b315801db6cd53f19c082fe5ff5bb5e16b7590cf80e78a64d4eb9ffcdb78',
				'hex',
			),
			transactionRoot: Buffer.from(
				'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				'hex',
			),
			generatorPublicKey: Buffer.from(
				'3ace09386cb05502cb74c61ed2a3c7638326367c0833923705eec7f58e749dfa',
				'hex',
			),
			reward: BigInt('100000000'),
			asset: Buffer.from('080010d587e1071a1027788cc63263b66019a26098d65609eb', 'hex'),
			signature: Buffer.from(
				'e02de7f99da10c154b47c46bc7b21ed794529758e77d30e0868b9a53077b20c4835d3e3531f4e6136a89fc8fad5217323b30b3347f51b6428ef63fe3b2001b02',
				'hex',
			),
			id: Buffer.from('a0d757141ef804fe2deafea18e4ca139c8c14cd94679d0152ca5255274fd59ff', 'hex'),
		},
		payload: [],
	},
	{
		header: {
			version: 2,
			timestamp: 1629547910,
			height: 16270316,
			previousBlockID: Buffer.from(
				'a0d757141ef804fe2deafea18e4ca139c8c14cd94679d0152ca5255274fd59ff',
				'hex',
			),
			transactionRoot: Buffer.from(
				'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				'hex',
			),
			generatorPublicKey: Buffer.from(
				'6aa6b614bc6f3d5abdbf8da42bcc35429262a4dd01752ec382c18201467cfadb',
				'hex',
			),
			reward: BigInt('100000000'),
			asset: Buffer.from('080010d587e1071a10d1f63d3b2372bbd888e24724f16ea639', 'hex'),
			signature: Buffer.from(
				'afbb0eea410b39e3aaa4ac68acba97d7bb9f013387e7f7d8d67d8520e1eb3428c849ece51c21ad799bae5476a7f92887c51b514abd7e0ca6b4d94a5d35d48a0f',
				'hex',
			),
			id: Buffer.from('01292f9c98aebd572bcf9aec120a8fbd4767328abc5081997f90f9c80c710d50', 'hex'),
		},
		payload: [],
	},
];

export const createFakeLegacyBlockHeaderV2 = (
	header?: Partial<LegacyBlockHeader>,
	payload?: Buffer[],
): LegacyBlockWithID => {
	const transactionRoot = payload
		? regularMerkleTree.calculateMerkleRootWithLeaves(payload.map(tx => utils.hash(tx)))
		: utils.hash(utils.getRandomBytes(32));

	const blockHeader = {
		version: 2,
		timestamp: header?.timestamp ?? 0,
		height: header?.height ?? 0,
		previousBlockID: header?.previousBlockID ?? utils.hash(utils.getRandomBytes(32)),
		transactionRoot,
		generatorPublicKey: header?.generatorPublicKey ?? utils.getRandomBytes(32),
		reward: header?.reward ?? BigInt(500000000),
		asset: header?.asset ?? utils.getRandomBytes(20),
		signature: header?.signature ?? utils.getRandomBytes(64),
	};
	const id = utils.hash(encodeBlock({ header: blockHeader, payload: payload ?? [] }));

	return {
		header: { ...blockHeader, id },
		payload: payload ?? [],
	};
};

/**
 * @params start: Start height of the block range going backwards
 * @params numberOfBlocks: Number of blocks to be generated with decreasing height
 */
export const getLegacyBlocksRangeV2 = (startHeight: number, numberOfBlocks: number): Buffer[] => {
	const blocks: LegacyBlockWithID[] = [];

	for (let i = startHeight; i >= startHeight - numberOfBlocks; i -= 1) {
		// After the startHeight, all the blocks are generated with previousBlockID as previous height block ID
		const block = createFakeLegacyBlockHeaderV2({
			height: i,
			previousBlockID:
				i === startHeight ? utils.getRandomBytes(32) : blocks[startHeight - i - 1].header.id,
		});
		blocks.push(block);
	}

	return blocks.map(b => encodeBlock(b));
};
