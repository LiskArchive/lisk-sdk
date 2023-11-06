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
 */
import { EventEmitter } from 'events';
import { dataStructures } from '@liskhq/lisk-utils';
import { Chain } from '@liskhq/lisk-chain';
import { bls, utils, address as cryptoAddress, legacy } from '@liskhq/lisk-cryptography';
import { InMemoryDatabase, Database } from '@liskhq/lisk-db';
import { when } from 'jest-when';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { Consensus, Keypair } from '../../../../src/engine/generator/types';
import { fakeLogger } from '../../../utils/mocks';
import { BFTModule } from '../../../../src/engine/bft';
import { createFakeBlockHeader } from '../../../../src/testing';
import { SingleCommitHandler } from '../../../../src/engine/generator/single_commit_handler';
import { testing } from '../../../../src';

describe('SingleCommitHandler', () => {
	const logger = fakeLogger;

	let chain: Chain;
	let consensus: Consensus;
	let keypairs: dataStructures.BufferMap<Keypair>;
	let blockchainDB: Database;
	let bft: BFTModule;
	let consensusEvent: EventEmitter;
	let singleCommitHandler: SingleCommitHandler;

	beforeEach(() => {
		blockchainDB = new InMemoryDatabase() as never;
		keypairs = new dataStructures.BufferMap<Keypair>();
		for (const key of testing.fixtures.keysList.keys) {
			keypairs.set(cryptoAddress.getAddressFromLisk32Address(key.address), {
				publicKey: Buffer.from(key.plain.generatorKey, 'hex'),
				privateKey: Buffer.from(key.plain.generatorPrivateKey, 'hex'),
				blsPublicKey: Buffer.from(key.plain.blsKey, 'hex'),
				blsSecretKey: Buffer.from(key.plain.blsPrivateKey, 'hex'),
			});
		}
		chain = {
			chainID: utils.getRandomBytes(32),
			lastBlock: {
				header: {
					id: Buffer.from('6846255774763267134'),
					height: 9187702,
					timestamp: 93716450,
				},
				transactions: [],
			},
			finalizedHeight: 100,
			dataAccess: {
				getBlockHeaderByHeight: jest.fn(),
			},
			constants: {
				chainID: Buffer.from('chainID'),
			},
		} as never;
		consensusEvent = new EventEmitter();
		consensus = {
			execute: jest.fn(),
			syncing: jest.fn().mockReturnValue(false),
			getAggregateCommit: jest.fn(),
			certifySingleCommit: jest.fn(),
			getConsensusParams: jest.fn().mockResolvedValue({
				currentValidators: [],
				implyMaxPrevote: true,
				maxHeightCertified: 0,
			}),
			getMaxRemovalHeight: jest.fn().mockResolvedValue(0),
			events: consensusEvent,
		} as never;
		bft = {
			beforeTransactionsExecute: jest.fn(),
			method: {
				getBFTHeights: jest.fn().mockResolvedValue({
					maxHeightPrevoted: 0,
					maxHeightPrecommitted: 0,
					maxHeightCertified: 0,
				}),
				setBFTParameters: jest.fn(),
				getBFTParameters: jest.fn().mockResolvedValue({ validators: [] }),
				getBFTParametersActiveValidators: jest.fn().mockResolvedValue({ validators: [] }),
				existBFTParameters: jest.fn().mockResolvedValue(false),
				getGeneratorAtTimestamp: jest.fn(),
				impliesMaximalPrevotes: jest.fn().mockResolvedValue(false),
				getSlotNumber: jest.fn(),
				getSlotTime: jest.fn(),
			},
		} as never;
		singleCommitHandler = new SingleCommitHandler(
			logger,
			chain,
			consensus,
			bft,
			keypairs,
			blockchainDB,
		);
	});

	describe('events CONSENSUS_EVENT_FINALIZED_HEIGHT_CHANGED', () => {
		const passphrase = Mnemonic.generateMnemonic(256);
		const keys = legacy.getPrivateAndPublicKeyFromPassphrase(passphrase);
		const address = cryptoAddress.getAddressFromPublicKey(keys.publicKey);
		const blsSecretKey = bls.generatePrivateKey(Buffer.from(passphrase, 'utf-8'));
		const keypair = {
			...keys,
			blsSecretKey,
			blsPublicKey: bls.getPublicKeyFromPrivateKey(blsSecretKey),
		};
		const blsKey = bls.getPublicKeyFromPrivateKey(keypair.blsSecretKey);
		const blockHeader = createFakeBlockHeader();

		describe('when generator is a standby validator', () => {
			beforeEach(() => {
				keypairs.set(address, keypair);
				when(singleCommitHandler['_bft'].method.existBFTParameters as jest.Mock)
					.calledWith(expect.anything(), 1)
					.mockResolvedValue(true as never)
					.calledWith(expect.anything(), 12)
					.mockResolvedValue(true as never)
					.calledWith(expect.anything(), 21)
					.mockResolvedValue(true as never)
					.calledWith(expect.anything(), 51)
					.mockResolvedValue(false as never)
					.calledWith(expect.anything(), 55)
					.mockResolvedValue(true as never);
				when(singleCommitHandler['_bft'].method.getBFTParametersActiveValidators as jest.Mock)
					.calledWith(expect.anything(), 11)
					.mockResolvedValue({
						validators: [{ address: utils.getRandomBytes(20), blsKey: utils.getRandomBytes(48) }],
					})
					.calledWith(expect.anything(), 20)
					.mockResolvedValue({
						validators: [{ address: utils.getRandomBytes(20), blsKey: utils.getRandomBytes(48) }],
					})
					.calledWith(expect.anything(), 50)
					.mockResolvedValue({
						validators: [{ address: utils.getRandomBytes(20), blsKey: utils.getRandomBytes(48) }],
					})
					.calledWith(expect.anything(), 54)
					.mockResolvedValue({ validators: [] });

				jest
					.spyOn(singleCommitHandler['_chain'].dataAccess, 'getBlockHeaderByHeight')
					.mockResolvedValue(blockHeader as never);
				jest.spyOn(singleCommitHandler['_consensus'], 'certifySingleCommit');
			});

			it('should not call certifySingleCommit when standby validator creates block', async () => {
				// Act
				await singleCommitHandler.handleFinalizedHeightChanged(10, 50);

				// Assert
				expect(singleCommitHandler['_consensus'].certifySingleCommit).toHaveBeenCalledTimes(0);
			});
		});

		describe('when generator is an active validator', () => {
			beforeEach(() => {
				keypairs.set(address, keypair);
				when(singleCommitHandler['_bft'].method.existBFTParameters as jest.Mock)
					.calledWith(expect.anything(), 1)
					.mockResolvedValue(true as never)
					.calledWith(expect.anything(), 12)
					.mockResolvedValue(true as never)
					.calledWith(expect.anything(), 21)
					.mockResolvedValue(true as never)
					.calledWith(expect.anything(), 51)
					.mockResolvedValue(false as never)
					.calledWith(expect.anything(), 55)
					.mockResolvedValue(true as never);
				when(singleCommitHandler['_bft'].method.getBFTParametersActiveValidators as jest.Mock)
					.calledWith(expect.anything(), 11)
					.mockResolvedValue({ validators: [{ address, blsKey }] })
					.calledWith(expect.anything(), 20)
					.mockResolvedValue({ validators: [{ address, blsKey: Buffer.alloc(48) }] })
					.calledWith(expect.anything(), 50)
					.mockResolvedValue({ validators: [{ address, blsKey }] })
					.calledWith(expect.anything(), 54)
					.mockResolvedValue({ validators: [] });

				jest
					.spyOn(singleCommitHandler['_chain'].dataAccess, 'getBlockHeaderByHeight')
					.mockResolvedValue(blockHeader as never);
				jest.spyOn(singleCommitHandler['_consensus'], 'certifySingleCommit');
			});

			it('should call certifySingleCommit for range when params for height + 1 exist', async () => {
				// Act
				await singleCommitHandler.handleFinalizedHeightChanged(10, 50);

				// Assert
				expect(singleCommitHandler['_consensus'].certifySingleCommit).toHaveBeenCalledTimes(2);
				expect(singleCommitHandler['_consensus'].certifySingleCommit).toHaveBeenCalledWith(
					blockHeader,
					{
						address,
						blsPublicKey: blsKey,
						blsSecretKey: keypair.blsSecretKey,
					},
				);
			});

			it('should not call certifySingleCommit for range when params for height + 1 does not exist', async () => {
				// Act
				await singleCommitHandler.handleFinalizedHeightChanged(51, 54);

				// Assert
				expect(singleCommitHandler['_consensus'].certifySingleCommit).not.toHaveBeenCalled();
			});

			it('should not call certifySingleCommit for finalized height + 1 when BFT params exist', async () => {
				// Act
				await singleCommitHandler.handleFinalizedHeightChanged(53, 54);

				// Assert
				expect(singleCommitHandler['_consensus'].certifySingleCommit).not.toHaveBeenCalled();
			});

			it('should not call certifySingleCommit for the validator who has not registered bls key', async () => {
				// Act
				await singleCommitHandler.handleFinalizedHeightChanged(20, 21);

				// Assert
				expect(singleCommitHandler['_consensus'].certifySingleCommit).not.toHaveBeenCalled();
			});

			it('should call certifySingleCommit for finalized height + 1 when BFT params does not exist', async () => {
				// For height 50, it should ceritifySingleCommit event though BFTParameter does not exist
				await singleCommitHandler.handleFinalizedHeightChanged(15, 50);

				// Assert
				expect(singleCommitHandler['_consensus'].certifySingleCommit).toHaveBeenCalledTimes(1);
				expect(singleCommitHandler['_consensus'].certifySingleCommit).toHaveBeenCalledWith(
					blockHeader,
					{
						address,
						blsPublicKey: blsKey,
						blsSecretKey: keypair.blsSecretKey,
					},
				);
			});

			it('should not call certifySingleCommit when validator is not active at the height', async () => {
				// height 20 returns existBFTParameters true, but no active validators.
				// Therefore, it should not certify single commit
				// Act
				await singleCommitHandler.handleFinalizedHeightChanged(15, 54);

				// Assert
				expect(singleCommitHandler['_consensus'].certifySingleCommit).not.toHaveBeenCalled();
			});
		});

		describe('when previous finalized height change and maxRemovalHeight is non zero', () => {
			beforeEach(() => {
				jest.spyOn(singleCommitHandler, '_handleFinalizedHeightChanged' as never);
				jest.spyOn(singleCommitHandler, '_certifySingleCommitForChangedHeight' as never);
				jest.spyOn(singleCommitHandler, '_certifySingleCommit' as never);
			});

			it('should not call certifySingleCommit when getMaxRemovalHeight is higher than next finalized height', async () => {
				jest.spyOn(consensus, 'getMaxRemovalHeight').mockResolvedValue(30000);
				await singleCommitHandler.handleFinalizedHeightChanged(0, 25520);

				expect(singleCommitHandler['_handleFinalizedHeightChanged']).not.toHaveBeenCalledWith(
					address,
					30000,
					25520,
				);
			});

			it('should call certifySingleCommit when getMaxRemovalHeight is lower than next finalized height', async () => {
				jest.spyOn(consensus, 'getMaxRemovalHeight').mockResolvedValue(30000);
				await singleCommitHandler.handleFinalizedHeightChanged(30001, 30003);

				expect(singleCommitHandler['_handleFinalizedHeightChanged']).toHaveBeenCalledWith(
					expect.any(Buffer),
					30001,
					30003,
				);
				expect(singleCommitHandler['_certifySingleCommitForChangedHeight']).toHaveBeenCalledTimes(
					1 * keypairs.size,
				);
				expect(singleCommitHandler['_certifySingleCommit']).toHaveBeenCalledTimes(
					1 * keypairs.size,
				);
			});
		});
	});
});
