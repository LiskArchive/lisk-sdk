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

describe('Name of the group', () => {
	it.todo('add tests for certificate generation');
});
// describe('Auxiliary Functions', () => {
//   let aggregateCommit: AggregateCommit = {
//     height: 2,
//     aggregationBits: Buffer.from('00', 'hex'),
//     certificateSignature: Buffer.alloc(0),
//   };

//   const aggregateCommits: AggregateCommit[] = [
//     aggregateCommit,
//     aggregateCommit,
//     aggregateCommit,
//     aggregateCommit,
//   ];

//   const block = {
//     header: {
//       version: 2,
//       timestamp: 1658508497,
//       height: 2,
//       previousBlockID: Buffer.from(
//         'b3778ca5ff83a6da5fea3b96fae6538c24b0ee88236faf06495022782d09756f',
//         'hex',
//       ),
//       stateRoot: Buffer.from(
//         'f7df9bec6d6106acb86a386d389a89988b0ebf5c9c722f375864e6f4983d4af7',
//         'hex',
//       ),
//       assetRoot: Buffer.from(
//         'f81025331b0ac890653ab48aa928b63724b40362ba707931ca524f8df513a24e',
//         'hex',
//       ),
//       eventRoot: Buffer.from(
//         'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
//         'hex',
//       ),
//       transactionRoot: Buffer.from(
//         'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
//         'hex',
//       ),
//       validatorsHash: Buffer.from(
//         'ad0076aa444f6cda608bb163c3bd77d9bf172f1d2803d53095bc0f277db6bcb3',
//         'hex',
//       ),
//       aggregateCommit: {
//         height: 0,
//         aggregationBits: Buffer.alloc(0),
//         certificateSignature: Buffer.alloc(0),
//       },
//       generatorAddress: Buffer.from('38562249e1969099833677a98e0c1a5ebaa2a191', 'hex'),
//       maxHeightPrevoted: 0,
//       maxHeightGenerated: 0,
//       signature: Buffer.from(
//         '82743907d3beb8565638a5d82a8891a7142abfa5b6e3328ed7259efc7a66acd71617eef2ec50191d42027f8bfefa361f087b714981641231d312347393d20f01',
//         'hex',
//       ),
//       impliesMaxPrevotes: true,
//       id: Buffer.from('f04938e16d894bcbbe71efcc2ef053ee5d149a4ecca099137398d70876afc164'),
//     },
//     transactions: [],
//     assets: [
//       {
//         moduleID: '0000000f',
//         data: '0a100ec4eed9bdb878f3454356db515aed2c',
//       },
//     ],
//   };

//   const bftHeights: BFTHeights = {
//     maxHeightPrevoted: 5,
//     maxHeightPrecommitted: 5,
//     maxHeightCertified: 3,
//   };

//   let blsKeyToBFTWeight: Record<string, bigint> = {
//     ad0076aa444f6cda608bb163c3bd77d9bf172f1d2803d53095bc0f277db6bcb3: BigInt(1),
//   };

//   beforeEach(async () => {
//     jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(sidechainAPIClientMock as never);
//     await chainConnectorPlugin.init({
//       logger: testing.mocks.loggerMock,
//       config: {
//         mainchainIPCPath: '~/.lisk/mainchain',
//         sidechainIPCPath: '~/.list/sidechain',
//       },
//       appConfig: appConfigForPlugin,
//     });

//     when(sidechainAPIClientMock.invoke)
//       .calledWith('interoperability_getOwnChainAccount')
//       .mockResolvedValue({
//         chainID: ownChainID.toString('hex'),
//       });
//     when(sidechainAPIClientMock.invoke)
//       .calledWith('interoperability_getChainAccount', { chainID: ownChainID })
//       .mockResolvedValue({
//         height: 10,
//         stateRoot: cryptography.utils.getRandomBytes(32).toString('hex'),
//         timestamp: Date.now(),
//         validatorsHash: cryptography.utils.getRandomBytes(32).toString('hex'),
//       });

//     await chainConnectorPlugin.load();

//     (chainConnectorPlugin as any)['_sidechainChainConnectorDB'] = chainConnectorInfoDBMock;
//     chainConnectorInfoDBMock.getBlockHeaders.mockResolvedValue([
//       {
//         ...block.header,
//         height: 1,
//       },
//       {
//         ...block.header,
//       },
//     ] as never);

//     chainConnectorInfoDBMock.getValidatorsHashPreImage.mockResolvedValue([
//       {
//         validatorsHash: block.header.validatorsHash,
//         validators: [
//           {
//             bftWeight: BigInt(0),
//             blsKey: Buffer.from('00', 'hex'),
//           },
//         ],
//       },
//     ] as never);
//   });

//   describe('getCertificateFromAggregateCommit', () => {
//     it('should call getBlockHeaders', async () => {
//       await chainConnectorPlugin['_getCertificateFromAggregateCommit'](aggregateCommit);

//       expect(
//         chainConnectorPlugin['_sidechainChainConnectorDB']['getBlockHeaders'],
//       ).toHaveBeenCalledTimes(1);
//     });

//     it('should compute Certificate from BlockHeader', async () => {
//       const blockHeader: chain.BlockHeader = new chain.BlockHeader(block.header);
//       const expectedCertificate = computeCertificateFromBlockHeader(blockHeader);
//       // when(chainConnectorPlugin['_sidechainChainConnectorDB'].getBlockHeaders)
//       // 	.calledWith()
//       // 	.mockResolvedValue([blockHeader]);

//       expectedCertificate.aggregationBits = Buffer.alloc(0);
//       expectedCertificate.signature = Buffer.alloc(0);

//       const certificate = await chainConnectorPlugin['_getCertificateFromAggregateCommit'](
//         aggregateCommit,
//       );

//       expect(certificate).toEqual(expectedCertificate);
//     });
//   });

//   describe('getNextCertificateFromAggregateCommits', () => {
//     let expectedCertificate: Certificate;

//     beforeEach(() => {
//       const blockHeader: chain.BlockHeader = new chain.BlockHeader(block.header);
//       expectedCertificate = computeCertificateFromBlockHeader(blockHeader);

//       (chainConnectorPlugin['_sidechainAPIClient'] as any).invoke = jest
//         .fn()
//         .mockResolvedValue(bftHeights);

//       chainConnectorPlugin['_checkChainOfTrust'] = jest
//         .fn()
//         .mockResolvedValueOnce(false)
//         .mockResolvedValueOnce(true);
//       chainConnectorPlugin['_getCertificateFromAggregateCommit'] = jest
//         .fn()
//         .mockResolvedValue(expectedCertificate);
//     });

//     it('should call getBlockHeaders', async () => {
//       await chainConnectorPlugin.getNextCertificateFromAggregateCommits(2, aggregateCommits);

//       expect(
//         chainConnectorPlugin['_sidechainChainConnectorDB']['getBlockHeaders'],
//       ).toHaveBeenCalledTimes(1);
//     });

//     it('should invoke consensus_getBFTHeights on _sidechainAPIClient', async () => {
//       await chainConnectorPlugin.getNextCertificateFromAggregateCommits(2, aggregateCommits);

//       expect((chainConnectorPlugin['_sidechainAPIClient'] as any).invoke).toHaveBeenCalledWith(
//         'consensus_getBFTHeights',
//       );
//     });

//     it('should return undefined if BFTHeights.lastCertifiedHeight < provided lastCertifiedHeight', async () => {
//       const certificate = await chainConnectorPlugin.getNextCertificateFromAggregateCommits(
//         2,
//         aggregateCommits,
//       );

//       expect(certificate).toBeUndefined();
//     });

//     it('should return certificate from aggregateCommit if chainOfTrust is valid', async () => {
//       const certificate = getNextCertificateFromAggregateCommits(
//         1,
//         aggregateCommits,
//       );

//       expect(checkChainOfTrust).toHaveBeenCalledTimes(2);
//       expect(getCertificateFromAggregateCommit).toHaveBeenCalledTimes(1);

//       expect(certificate).toEqual(expectedCertificate);
//     });
//   });

//   describe('checkChainOfTrust', () => {
//     it('should call getChainConnectorInfo', async () => {
//       checkChainOfTrust(
//         block.header.validatorsHash,
//         blsKeyToBFTWeight,
//         BigInt(1),
//         aggregateCommit,
//         [],
//         [],
//       );

//       expect(
//         chainConnectorPlugin['_sidechainChainConnectorDB']['getBlockHeaders'],
//       ).toHaveBeenCalledTimes(1);
//     });

//     it('should validate for valid lastValidatorsHash', async () => {
//       const valid = checkChainOfTrust(
//         block.header.validatorsHash,
//         blsKeyToBFTWeight,
//         BigInt(2),
//         aggregateCommit,
//         [],
//         [],
//       );

//       expect(valid).toBe(true);
//     });

//     it('should validate if aggregateBFTWeight is equal or greater than provided lastCertificateThreshold', async () => {
//       aggregateCommit = {
//         height: 2,
//         aggregationBits: Buffer.from('01', 'hex'),
//         certificateSignature: Buffer.alloc(0),
//       };

//       blsKeyToBFTWeight = {
//         ad0076aa444f6cda608bb163c3bd77d9bf172f1d2803d53095bc0f277db6bcb3: BigInt(5),
//       };

//       jest
//         .spyOn(chainConnectorPlugin['_sidechainChainConnectorDB'], 'getBlockHeaders')
//         .mockResolvedValue([
//           {
//             ...block.header,
//             height: -1,
//           },
//           {
//             ...block.header,
//             height: aggregateCommit.height - 1,
//           },
//         ] as never);

//       jest
//         .spyOn(chainConnectorPlugin['_sidechainChainConnectorDB'], 'getValidatorsHashPreImage')
//         .mockResolvedValue([
//           {
//             validatorsHash: block.header.validatorsHash,
//             validators: [
//               {
//                 bftWeight: BigInt(0),
//                 blsKey: Buffer.from(
//                   'ad0076aa444f6cda608bb163c3bd77d9bf172f1d2803d53095bc0f277db6bcb3',
//                   'hex',
//                 ),
//               },
//             ],
//           },
//         ] as never);

//       let valid = await chainConnectorPlugin['_checkChainOfTrust'](
//         Buffer.from('0', 'hex'),
//         blsKeyToBFTWeight,
//         BigInt(2),
//         aggregateCommit,
//       );

//       expect(valid).toBe(true);

//       valid = await chainConnectorPlugin['_checkChainOfTrust'](
//         Buffer.from('0', 'hex'),
//         blsKeyToBFTWeight,
//         BigInt(-1),
//         aggregateCommit,
//       );

//       expect(valid).toBe(true);
//     });

//     it('should not validate if aggregateBFTWeight is less than provided lastCertificateThreshold', async () => {
//       const valid = await chainConnectorPlugin['_checkChainOfTrust'](
//         Buffer.from('0', 'hex'),
//         blsKeyToBFTWeight,
//         BigInt(2),
//         aggregateCommit,
//       );

//       expect(valid).toBe(false);
//     });
//   });
// });
