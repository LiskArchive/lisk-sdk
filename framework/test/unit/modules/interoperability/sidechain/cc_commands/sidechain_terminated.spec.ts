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

import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import {
	CCMStatusCode,
	CROSS_CHAIN_COMMAND_REGISTRATION,
	EMPTY_HASH,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../../src/modules/interoperability/constants';
import { SidechainCCSidechainTerminatedCommand } from '../../../../../../src/modules/interoperability/sidechain/cc_commands';
import { sidechainTerminatedCCMParamsSchema } from '../../../../../../src/modules/interoperability/schemas';
import { CrossChainMessageContext } from '../../../../../../src/modules/interoperability/types';
import {
	createCrossChainMessageContext,
	InMemoryPrefixedStateDB,
} from '../../../../../../src/testing';
import { SidechainInteroperabilityModule } from '../../../../../../src';
import { SidechainInteroperabilityInternalMethod } from '../../../../../../src/modules/interoperability/sidechain/internal_method';
import { TerminatedStateStore } from '../../../../../../src/modules/interoperability/stores/terminated_state';
import { PrefixedStateReadWriter } from '../../../../../../src/state_machine/prefixed_state_read_writer';
import { createStoreGetter } from '../../../../../../src/testing/utils';

describe('SidechainCCSidechainTerminatedCommand', () => {
	const interopMod = new SidechainInteroperabilityModule();

	const chainID = Buffer.from([0, 0, 1, 0]);

	const ccmSidechainTerminatedParams = {
		chainID: utils.intToBuffer(5, 4),
		stateRoot: utils.getRandomBytes(32),
	};

	const encodedSidechainTerminatedParams = codec.encode(
		sidechainTerminatedCCMParamsSchema,
		ccmSidechainTerminatedParams,
	);

	const ccm = {
		nonce: BigInt(0),
		module: MODULE_NAME_INTEROPERABILITY,
		crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
		sendingChainID: Buffer.from([0, 0, 0, 0]),
		receivingChainID: utils.intToBuffer(1, 4),
		fee: BigInt(20000),
		status: CCMStatusCode.OK,
		params: encodedSidechainTerminatedParams,
	};

	const storedTerminatedState = {
		stateRoot: utils.getRandomBytes(32),
		mainchainStateRoot: utils.getRandomBytes(32),
		initialized: true,
	};

	let ccSidechainTerminatedCommand: SidechainCCSidechainTerminatedCommand;
	let context: CrossChainMessageContext;
	let terminatedStateSubstore: TerminatedStateStore;
	let stateStore: PrefixedStateReadWriter;

	beforeEach(() => {
		ccSidechainTerminatedCommand = new SidechainCCSidechainTerminatedCommand(
			interopMod.stores,
			interopMod.events,
			new Map(),
			new SidechainInteroperabilityInternalMethod(interopMod.stores, interopMod.events, new Map()),
		);

		jest
			.spyOn(ccSidechainTerminatedCommand['internalMethods'], 'createTerminatedStateAccount')
			.mockResolvedValue();

		terminatedStateSubstore = interopMod.stores.get(TerminatedStateStore);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());

		context = createCrossChainMessageContext({
			ccm: { ...ccm },
			chainID,
			stateStore,
		});
	});

	describe('verify', () => {
		it('should reject when the ccm status is not OK', async () => {
			await expect(
				ccSidechainTerminatedCommand.verify(
					createCrossChainMessageContext({
						ccm: { ...ccm, status: CCMStatusCode.FAILED_CCM },
						chainID,
					}),
				),
			).rejects.toThrow('Sidechain terminated message must have status OK');
		});

		it('should reject when the sending chainID is not mainchain', async () => {
			await expect(
				ccSidechainTerminatedCommand.verify(
					createCrossChainMessageContext({
						ccm: { ...ccm, sendingChainID: Buffer.from([1, 0, 1, 0]) },
						chainID,
					}),
				),
			).rejects.toThrow('Sidechain terminated message must be sent from the mainchain');
		});

		it('should resolve when data is valid', async () => {
			await expect(
				ccSidechainTerminatedCommand.verify(
					createCrossChainMessageContext({
						ccm,
						chainID,
					}),
				),
			).resolves.toBeUndefined();
		});
	});

	describe('execute', () => {
		it('should update terminatedStateAccount exists and initialized', async () => {
			await terminatedStateSubstore.set(
				createStoreGetter(stateStore),
				chainID,
				storedTerminatedState,
			);

			await expect(
				ccSidechainTerminatedCommand.execute({
					...context,
					params: ccmSidechainTerminatedParams,
				}),
			).resolves.toBeUndefined();

			expect(
				ccSidechainTerminatedCommand['internalMethods'].createTerminatedStateAccount,
			).toHaveBeenCalledTimes(0);
			await expect(
				terminatedStateSubstore.get(createStoreGetter(stateStore), chainID),
			).resolves.toStrictEqual(storedTerminatedState);
		});

		it('should do nothing when terminatedStateAccount exists and not initialized', async () => {
			await terminatedStateSubstore.set(createStoreGetter(stateStore), chainID, {
				...storedTerminatedState,
				initialized: false,
			});

			await expect(
				ccSidechainTerminatedCommand.execute({
					...context,
					params: ccmSidechainTerminatedParams,
				}),
			).resolves.toBeUndefined();

			expect(
				ccSidechainTerminatedCommand['internalMethods'].createTerminatedStateAccount,
			).toHaveBeenCalledTimes(0);
			await expect(
				terminatedStateSubstore.get(createStoreGetter(stateStore), chainID),
			).resolves.toStrictEqual({
				stateRoot: ccmSidechainTerminatedParams.stateRoot,
				mainchainStateRoot: EMPTY_HASH,
				initialized: true,
			});
		});

		it('should create terminatedStateAccount when terminatedStateAccount does not exist', async () => {
			await expect(
				ccSidechainTerminatedCommand.execute({
					...context,
					params: ccmSidechainTerminatedParams,
				}),
			).resolves.toBeUndefined();

			expect(
				ccSidechainTerminatedCommand['internalMethods'].createTerminatedStateAccount,
			).toHaveBeenCalledWith(
				expect.anything(),
				ccmSidechainTerminatedParams.chainID,
				ccmSidechainTerminatedParams.stateRoot,
			);
		});
	});
});
