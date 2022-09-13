/*
 * Copyright © 2018 Lisk Foundation
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
import { Chain } from '@liskhq/lisk-chain';
import { address } from '@liskhq/lisk-cryptography';
import * as testing from '../../../src/testing';
import { createTransferTransaction, DEFAULT_TOKEN_ID } from '../../utils/mocks/transaction';
import { TokenModule } from '../../../src';
import { genesisTokenStoreSchema } from '../../../src/modules/token';
import { GenesisTokenStore } from '../../../src/modules/token/types';
import { Consensus } from '../../../src/engine/consensus';
import { Network } from '../../../src/engine/network';

describe('genesis block', () => {
	const databasePath = '/tmp/lisk/genesis_block/test';
	const genesis = testing.fixtures.defaultFaucetAccount;

	let processEnv: testing.BlockProcessingEnv;
	let chainID: Buffer;

	beforeAll(async () => {
		processEnv = await testing.getBlockProcessingEnv({
			options: {
				databasePath,
			},
		});
		chainID = processEnv.getNetworkId();
	});

	afterAll(() => {
		processEnv.cleanup({ databasePath });
	});

	describe('given the application has not been initialized', () => {
		describe('when chain module is bootstrapped', () => {
			it('should save genesis block to the database', async () => {
				const block = await processEnv.getChain().dataAccess.getBlockByHeight(0);

				expect(block.header.version).toEqual(0);
				expect(block.header.toObject()).toEqual(processEnv.getGenesisBlock().header.toObject());
			});

			it('should save accounts from genesis block assets', async () => {
				// Get genesis accounts
				const tokenAsset = processEnv.getGenesisBlock().assets.getAsset(new TokenModule().name);
				const decoded = codec.decode<GenesisTokenStore>(
					genesisTokenStoreSchema,
					tokenAsset as Buffer,
				);

				// Get delegate accounts in genesis block from the database
				expect.assertions(decoded.userSubstore.length);
				for (const data of decoded.userSubstore) {
					const balance = await processEnv.invoke<{ availableBalance: string }>(
						'token_getBalance',
						{
							tokenID: DEFAULT_TOKEN_ID.toString('hex'),
							address: address.getLisk32AddressFromAddress(data.address),
						},
					);
					expect(balance.availableBalance).toEqual(data.availableBalance.toString());
				}
			});

			it('should have correct delegate list', async () => {
				const validators = await processEnv.invoke<{
					list: { address: string; nextAllocatedTime: number }[];
				}>('chain_getGeneratorList', {});
				expect(
					validators.list
						.sort((a, b) =>
							address
								.getAddressFromLisk32Address(a.address)
								.compare(address.getAddressFromLisk32Address(b.address)),
						)
						.map(v => v.address),
				).toMatchSnapshot();
			});
		});
	});

	describe('given the application was initialized earlier', () => {
		let newBalance: bigint;
		let oldBalance: bigint;
		let recipientAddress: Buffer;

		beforeEach(async () => {
			const tokenAsset = processEnv.getGenesisBlock().assets.getAsset(new TokenModule().name);
			const decoded = codec.decode<GenesisTokenStore>(
				genesisTokenStoreSchema,
				tokenAsset as Buffer,
			);
			recipientAddress = decoded.userSubstore[decoded.userSubstore.length - 1].address;
			const recipient = await processEnv.invoke<{ availableBalance: string }>('token_getBalance', {
				address: address.getLisk32AddressFromAddress(recipientAddress),
				tokenID: DEFAULT_TOKEN_ID.toString('hex'),
			});
			oldBalance = BigInt(recipient.availableBalance);
			newBalance = oldBalance + BigInt('100000000000');
			const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
				address: genesis.address,
			});

			const transaction = createTransferTransaction({
				amount: BigInt('100000000000'),
				recipientAddress,
				chainID,
				nonce: BigInt(authData.nonce),
				privateKey: Buffer.from(genesis.privateKey, 'hex'),
			});
			const newBlock = await processEnv.createBlock([transaction]);
			await processEnv.process(newBlock);
		});

		describe('when chain module is bootstrapped', () => {
			it('should not apply the genesis block again', async () => {
				// Act
				const consensus = processEnv.getConsensus();

				const chain = new Chain({
					maxTransactionsSize: 15 * 1024,
					keepEventsForHeights: -1,
				});
				const newConsensus = new Consensus({
					abi: consensus['_abi'],
					bft: consensus['_bft'],
					chain,
					genesisConfig: consensus['_genesisConfig'],
					network: ({
						registerEndpoint: () => {},
						registerHandler: () => {},
					} as unknown) as Network,
				});
				chain.init({
					db: processEnv.getBlockchainDB(),
					genesisBlock: processEnv.getGenesisBlock(),
					chainID: processEnv.getNetworkId(),
				});
				await newConsensus.init({
					db: consensus['_db'],
					genesisBlock: processEnv.getGenesisBlock(),
					logger: consensus['_logger'],
				});

				const balance = await processEnv.invoke<{ availableBalance: string }>('token_getBalance', {
					address: address.getLisk32AddressFromAddress(recipientAddress),
					tokenID: DEFAULT_TOKEN_ID.toString('hex'),
				});

				// Arrange & Assert
				expect(balance.availableBalance).toEqual(newBalance.toString());
			});
		});
	});
});
