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
import { codec } from '@liskhq/lisk-codec';
import {
	ImmutableStoreGetter,
	MainchainInteroperabilityModule,
	StoreGetter,
	TokenMethod,
} from '../../../../src';
import { BaseInteroperabilityMethod } from '../../../../src/modules/interoperability/base_interoperability_method';
import {
	CCMSendFailedCodes,
	CCM_STATUS_OK,
	CHAIN_ACTIVE,
	CHAIN_ID_MAINCHAIN,
	CHAIN_TERMINATED,
	EMPTY_BYTES,
	MAX_CCM_SIZE,
} from '../../../../src/modules/interoperability/constants';
import { CcmSendFailEvent } from '../../../../src/modules/interoperability/events/ccm_send_fail';
import { CcmSendSuccessEvent } from '../../../../src/modules/interoperability/events/ccm_send_success';
import { MainchainInteroperabilityStore } from '../../../../src/modules/interoperability/mainchain/store';
import { ccmSchema } from '../../../../src/modules/interoperability/schemas';
import { ChainAccountStore } from '../../../../src/modules/interoperability/stores/chain_account';
import { OwnChainAccountStore } from '../../../../src/modules/interoperability/stores/own_chain_account';
import { NamedRegistry } from '../../../../src/modules/named_registry';
import { EventQueue, MethodContext } from '../../../../src/state_machine';
import { createTransientMethodContext } from '../../../../src/testing';

class SampleInteroperabilityMethod extends BaseInteroperabilityMethod<MainchainInteroperabilityStore> {
	protected getInteroperabilityStore = (
		context: StoreGetter | ImmutableStoreGetter,
	): MainchainInteroperabilityStore =>
		new MainchainInteroperabilityStore(
			this.stores,
			context,
			this.interoperableCCMethods,
			this.events,
		);
}

describe('Sample Method', () => {
	const interopMod = new MainchainInteroperabilityModule();
	const chainID = utils.intToBuffer(1, 4);
	const interoperableCCMethods = new Map();
	let sampleInteroperabilityMethod: SampleInteroperabilityMethod;
	let mainchainInteroperabilityStore: MainchainInteroperabilityStore;
	let methodContext: MethodContext;
	let tokenMethodMock: TokenMethod;
	let ccmSendFailEventMock: CcmSendFailEvent;
	let ccmSendSuccessEventMock: CcmSendSuccessEvent;

	beforeEach(() => {
		const defaultEventQueue = new EventQueue(0, [], [utils.hash(utils.getRandomBytes(32))]);
		methodContext = createTransientMethodContext({ eventQueue: defaultEventQueue });
		tokenMethodMock = {
			payMessageFee: jest.fn(),
		} as any;
		ccmSendFailEventMock = {
			log: jest.fn(),
		} as any;
		ccmSendSuccessEventMock = {
			log: jest.fn(),
		} as any;
		interopMod.events.register(CcmSendFailEvent, ccmSendFailEventMock);
		interopMod.events.register(CcmSendSuccessEvent, ccmSendSuccessEventMock);
		sampleInteroperabilityMethod = new SampleInteroperabilityMethod(
			interopMod.stores,
			interopMod.events,
			interoperableCCMethods,
		);
		sampleInteroperabilityMethod.addDependencies(tokenMethodMock as any);
		mainchainInteroperabilityStore = new MainchainInteroperabilityStore(
			interopMod.stores,
			methodContext,
			interoperableCCMethods,
			new NamedRegistry(),
		);
		jest
			.spyOn(sampleInteroperabilityMethod as any, 'getInteroperabilityStore')
			.mockReturnValue(mainchainInteroperabilityStore);
		jest.spyOn(mainchainInteroperabilityStore, 'getChainAccount').mockResolvedValue({} as never);
		jest.spyOn(mainchainInteroperabilityStore, 'getChannel').mockResolvedValue({} as never);
		jest.spyOn(mainchainInteroperabilityStore, 'getOwnChainAccount').mockResolvedValue({} as never);
		jest
			.spyOn(mainchainInteroperabilityStore, 'getTerminatedStateAccount')
			.mockResolvedValue({} as never);
		jest
			.spyOn(mainchainInteroperabilityStore, 'getTerminatedOutboxAccount')
			.mockResolvedValue({} as never);
	});

	describe('getChainAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await sampleInteroperabilityMethod.getChainAccount(methodContext, chainID);

			expect(sampleInteroperabilityMethod['getInteroperabilityStore']).toHaveBeenCalledWith(
				methodContext,
			);
		});

		it('should call getChainAccount', async () => {
			await sampleInteroperabilityMethod.getChainAccount(methodContext, chainID);

			expect(mainchainInteroperabilityStore.getChainAccount).toHaveBeenCalledWith(chainID);
		});
	});

	describe('getChannel', () => {
		it('should call getInteroperabilityStore', async () => {
			await sampleInteroperabilityMethod.getChannel(methodContext, chainID);

			expect(sampleInteroperabilityMethod['getInteroperabilityStore']).toHaveBeenCalledWith(
				methodContext,
			);
		});

		it('should call getChannel', async () => {
			await sampleInteroperabilityMethod.getChannel(methodContext, chainID);

			expect(mainchainInteroperabilityStore.getChannel).toHaveBeenCalledWith(chainID);
		});
	});

	describe('getOwnChainAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await sampleInteroperabilityMethod.getOwnChainAccount(methodContext);

			expect(sampleInteroperabilityMethod['getInteroperabilityStore']).toHaveBeenCalledWith(
				methodContext,
			);
		});

		it('should call getOwnChainAccount', async () => {
			await sampleInteroperabilityMethod.getOwnChainAccount(methodContext);

			expect(mainchainInteroperabilityStore.getOwnChainAccount).toHaveBeenCalled();
		});
	});

	describe('getTerminatedStateAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await sampleInteroperabilityMethod.getTerminatedStateAccount(methodContext, chainID);

			expect(sampleInteroperabilityMethod['getInteroperabilityStore']).toHaveBeenCalledWith(
				methodContext,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			await sampleInteroperabilityMethod.getTerminatedStateAccount(methodContext, chainID);

			expect(mainchainInteroperabilityStore.getTerminatedStateAccount).toHaveBeenCalled();
		});
	});

	describe('getTerminatedOutboxAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await sampleInteroperabilityMethod.getTerminatedOutboxAccount(methodContext, chainID);

			expect(sampleInteroperabilityMethod['getInteroperabilityStore']).toHaveBeenCalledWith(
				methodContext,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			await sampleInteroperabilityMethod.getTerminatedOutboxAccount(methodContext, chainID);

			expect(mainchainInteroperabilityStore.getTerminatedOutboxAccount).toHaveBeenCalledWith(
				chainID,
			);
		});
	});

	describe('send', () => {
		const sendingAddress = Buffer.from('lskqozpc4ftffaompmqwzd93dfj89g5uezqwhosg9');
		const ownChainAccountSidechain = {
			name: 'mychain',
			chainID: Buffer.from('10001000', 'hex'),
			nonce: BigInt(0),
		};

		const ownChainAccountMainchain = {
			name: 'mychain',
			chainID: CHAIN_ID_MAINCHAIN,
			nonce: BigInt(0),
		};

		const ccm = {
			module: 'token',
			crossChainCommand: 'transfer',
			fee: BigInt(100000),
			nonce: ownChainAccountSidechain.nonce,
			params: utils.getRandomBytes(10),
			receivingChainID: Buffer.from('00000001', 'hex'),
			sendingChainID: ownChainAccountSidechain.chainID,
			status: CCM_STATUS_OK,
		};

		beforeEach(() => {
			jest
				.spyOn(interopMod.stores.get(OwnChainAccountStore), 'get')
				.mockResolvedValue(ownChainAccountSidechain);
			jest.spyOn(mainchainInteroperabilityStore, 'isLive').mockResolvedValue(true);
		});

		it('should throw error and emit event when invalid ccm format', async () => {
			// Arrange
			const invalidSizeCCM = { ...ccm, params: utils.getRandomBytes(MAX_CCM_SIZE) };

			// Act & Assert
			await expect(
				sampleInteroperabilityMethod.send(
					methodContext,
					sendingAddress,
					invalidSizeCCM.module,
					invalidSizeCCM.crossChainCommand,
					invalidSizeCCM.receivingChainID,
					invalidSizeCCM.fee,
					invalidSizeCCM.status,
					invalidSizeCCM.params,
					Date.now(),
				),
			).rejects.toThrow('Invalid CCM format.');

			expect(ccmSendFailEventMock.log).toHaveBeenCalledWith(
				expect.anything(),
				{
					ccm: { ...invalidSizeCCM, params: EMPTY_BYTES },
					code: CCMSendFailedCodes.CCM_SEND_FAILED_CODE_INVALID_FORMAT,
				},
				true,
			);
		});

		it('should throw error and emit event when receiving chain is not live', async () => {
			// Arrange
			jest
				.spyOn(interopMod.stores.get(OwnChainAccountStore), 'get')
				.mockResolvedValue(ownChainAccountSidechain);
			jest.spyOn(mainchainInteroperabilityStore, 'isLive').mockResolvedValue(false);

			// Act & Assert
			await expect(
				sampleInteroperabilityMethod.send(
					methodContext,
					sendingAddress,
					ccm.module,
					ccm.crossChainCommand,
					ccm.receivingChainID,
					ccm.fee,
					ccm.status,
					ccm.params,
					Date.now(),
				),
			).rejects.toThrow('Receiving chain is not live.');

			expect(ccmSendFailEventMock.log).toHaveBeenCalledWith(
				expect.anything(),
				{
					ccm: { ...ccm, params: EMPTY_BYTES },
					code: CCMSendFailedCodes.CCM_SEND_FAILED_CODE_CHANNEL_UNAVAILABLE,
				},
				true,
			);
		});

		it('should throw error when processing on mainchain and receiving chain is not active', async () => {
			// Arrange
			const ccmOnMainchain = {
				...ccm,
				nonce: ownChainAccountMainchain.nonce,
				sendingChainID: ownChainAccountMainchain.chainID,
			};

			const receivingChainAccount = {
				name: 'mychain',
				lastCertificate: {
					height: 0,
					timestamp: Date.now(),
					stateRoot: utils.getRandomBytes(32),
					validatorsHash: utils.getRandomBytes(32),
				},
				status: CHAIN_TERMINATED,
			};
			jest
				.spyOn(interopMod.stores.get(OwnChainAccountStore), 'get')
				.mockResolvedValue(ownChainAccountMainchain);
			jest
				.spyOn(interopMod.stores.get(ChainAccountStore), 'get')
				.mockResolvedValue(receivingChainAccount);
			// Act & Assert
			await expect(
				sampleInteroperabilityMethod.send(
					methodContext,
					sendingAddress,
					ccmOnMainchain.module,
					ccmOnMainchain.crossChainCommand,
					ccmOnMainchain.receivingChainID,
					ccmOnMainchain.fee,
					ccmOnMainchain.status,
					ccmOnMainchain.params,
					Date.now(),
				),
			).rejects.toThrow('Receiving chain is not active.');

			expect(ccmSendFailEventMock.log).toHaveBeenCalledWith(
				expect.anything(),
				{
					ccm: { ...ccmOnMainchain, params: EMPTY_BYTES },
					code: CCMSendFailedCodes.CCM_SEND_FAILED_CODE_CHANNEL_UNAVAILABLE,
				},
				true,
			);
		});

		it('should throw error when processing on sidechain and receiving chain is not active', async () => {
			// Arrange
			const receivingChainAccount = {
				name: 'mychain',
				lastCertificate: {
					height: 0,
					timestamp: Date.now(),
					stateRoot: utils.getRandomBytes(32),
					validatorsHash: utils.getRandomBytes(32),
				},
				status: CHAIN_TERMINATED,
			};
			jest
				.spyOn(interopMod.stores.get(OwnChainAccountStore), 'get')
				.mockResolvedValue(ownChainAccountSidechain);
			jest
				.spyOn(interopMod.stores.get(ChainAccountStore), 'get')
				.mockResolvedValue(receivingChainAccount);
			// Act & Assert
			await expect(
				sampleInteroperabilityMethod.send(
					methodContext,
					sendingAddress,
					ccm.module,
					ccm.crossChainCommand,
					ccm.receivingChainID,
					ccm.fee,
					ccm.status,
					ccm.params,
					Date.now(),
				),
			).rejects.toThrow('Receiving chain is not active.');

			expect(ccmSendFailEventMock.log).toHaveBeenCalledWith(
				expect.anything(),
				{
					ccm: { ...ccm, params: EMPTY_BYTES },
					code: CCMSendFailedCodes.CCM_SEND_FAILED_CODE_CHANNEL_UNAVAILABLE,
				},
				true,
			);
		});

		it('should throw error when payMessageFee and log event when tokenMethod.payMessageFee fails', async () => {
			// Arrange
			const receivingChainAccount = {
				name: 'mychain',
				lastCertificate: {
					height: 0,
					timestamp: Date.now(),
					stateRoot: utils.getRandomBytes(32),
					validatorsHash: utils.getRandomBytes(32),
				},
				status: CHAIN_ACTIVE,
			};
			jest
				.spyOn(interopMod.stores.get(OwnChainAccountStore), 'get')
				.mockResolvedValue(ownChainAccountSidechain);
			jest
				.spyOn(interopMod.stores.get(ChainAccountStore), 'get')
				.mockResolvedValue(receivingChainAccount);
			jest
				.spyOn(sampleInteroperabilityMethod['_tokenMethod'], 'payMessageFee')
				.mockRejectedValue(new Error('payMessageFee error'));
			// Act & Assert
			await expect(
				sampleInteroperabilityMethod.send(
					methodContext,
					sendingAddress,
					ccm.module,
					ccm.crossChainCommand,
					ccm.receivingChainID,
					ccm.fee,
					ccm.status,
					ccm.params,
					Date.now(),
				),
			).rejects.toThrow('Failed to pay message fee.');

			expect(ccmSendFailEventMock.log).toHaveBeenCalledWith(
				expect.anything(),
				{
					ccm: { ...ccm, params: EMPTY_BYTES },
					code: CCMSendFailedCodes.CCM_SEND_FAILED_CODE_MESSAGE_FEE_EXCEPTION,
				},
				true,
			);
		});

		it('should process ccm successfully by calling addToOutbox and log success event', async () => {
			// Arrange
			const ccmOnMainchain = {
				...ccm,
				nonce: ownChainAccountMainchain.nonce,
				sendingChainID: ownChainAccountMainchain.chainID,
			};

			const receivingChainAccount = {
				name: 'mychain',
				lastCertificate: {
					height: 0,
					timestamp: Date.now(),
					stateRoot: utils.getRandomBytes(32),
					validatorsHash: utils.getRandomBytes(32),
				},
				status: CHAIN_ACTIVE,
			};
			jest
				.spyOn(interopMod.stores.get(OwnChainAccountStore), 'get')
				.mockResolvedValue(ownChainAccountMainchain);
			jest.spyOn(mainchainInteroperabilityStore, 'addToOutbox').mockResolvedValue();
			jest
				.spyOn(interopMod.stores.get(ChainAccountStore), 'get')
				.mockResolvedValue(receivingChainAccount);
			jest.spyOn(sampleInteroperabilityMethod['_tokenMethod'], 'payMessageFee').mockResolvedValue();

			const ownChainAccountStoreMock = jest.fn();
			interopMod.stores.get(OwnChainAccountStore).set = ownChainAccountStoreMock;
			const ccmID = utils.hash(codec.encode(ccmSchema, ccmOnMainchain));

			// Act & Assert
			await expect(
				sampleInteroperabilityMethod.send(
					methodContext,
					sendingAddress,
					ccmOnMainchain.module,
					ccmOnMainchain.crossChainCommand,
					ccmOnMainchain.receivingChainID,
					ccmOnMainchain.fee,
					ccmOnMainchain.status,
					ccmOnMainchain.params,
					Date.now(),
				),
			).resolves.toBeUndefined();

			expect(ownChainAccountStoreMock).toHaveBeenCalledWith(
				expect.anything(),
				EMPTY_BYTES,
				ownChainAccountMainchain,
			);
			expect(ccmSendSuccessEventMock.log).toHaveBeenCalledWith(
				expect.anything(),
				ccmOnMainchain.sendingChainID,
				ccmOnMainchain.receivingChainID,
				ccmID,
				{ ccmID },
			);
		});
	});
});
