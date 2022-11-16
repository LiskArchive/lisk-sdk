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
import { MainchainInteroperabilityModule } from '../../../../../src';
import {
	CCMStatusCode,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	MAINCHAIN_ID_BUFFER,
	MODULE_NAME_INTEROPERABILITY,
	HASH_LENGTH,
} from '../../../../../src/modules/interoperability/constants';
import { MainchainCCRegistrationCommand } from '../../../../../src/modules/interoperability/mainchain/cc_commands';
import { registrationCCMParamsSchema } from '../../../../../src/modules/interoperability/schemas';
import { CCMsg, CrossChainMessageContext } from '../../../../../src/modules/interoperability/types';
import { createCrossChainMessageContext } from '../../../../../src/testing';
import { ChannelDataStore } from '../../../../../src/modules/interoperability/stores/channel_data';
import { OwnChainAccountStore } from '../../../../../src/modules/interoperability/stores/own_chain_account';
import {
	ChainAccountStore,
	ChainStatus,
} from '../../../../../src/modules/interoperability/stores/chain_account';
import { CHAIN_ID_LENGTH } from '../../../../../src/modules/token/constants';
import { ChainAccountUpdatedEvent } from '../../../../../src/modules/interoperability/events/chain_account_updated';

describe('BaseCCRegistrationCommand', () => {
	const interopMod = new MainchainInteroperabilityModule();

	const objGetSetHas = () => ({
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	});

	const channelStoreMock = objGetSetHas();
	const ownChainAccountStoreMock = objGetSetHas();
	const chainAccountStoreMock = objGetSetHas();

	const chainAccountUpdatedEventMock = {
		log: jest.fn(),
	};

	const ownChainAccountMainchain = {
		name: 'mainchain',
		chainID: MAINCHAIN_ID_BUFFER,
		nonce: BigInt(0),
	};

	const sidechainIDBuffer = utils.intToBuffer(2, 4);
	const messageFeeTokenID = Buffer.from('0000000000000011', 'hex');
	const ccmRegistrationParams = {
		chainID: sidechainIDBuffer,
		name: ownChainAccountMainchain.name,
		messageFeeTokenID,
	};
	const encodedRegistrationParams = codec.encode(
		registrationCCMParamsSchema,
		ccmRegistrationParams,
	);

	const channelData = {
		inbox: {
			appendPath: [],
			root: Buffer.alloc(0),
			size: 0,
		},
		messageFeeTokenID,
		outbox: {
			appendPath: [],
			root: Buffer.alloc(0),
			size: 1,
		},
		partnerChainOutboxRoot: Buffer.alloc(0),
	};

	const chainAccount = {
		name: 'account1',
		chainID: Buffer.alloc(CHAIN_ID_LENGTH),
		lastCertificate: {
			height: 567467,
			timestamp: 1234,
			stateRoot: Buffer.alloc(HASH_LENGTH),
			validatorsHash: Buffer.alloc(HASH_LENGTH),
		},
		status: 2739,
	};

	interopMod.stores.register(ChannelDataStore, channelStoreMock as never);
	interopMod.stores.register(OwnChainAccountStore, ownChainAccountStoreMock as never);
	interopMod.stores.register(ChainAccountStore, chainAccountStoreMock as never);
	interopMod.events.register(ChainAccountUpdatedEvent, chainAccountUpdatedEventMock as never);

	const buildCCM = (obj: Partial<CCMsg>) => ({
		crossChainCommand: obj.crossChainCommand ?? CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
		fee: obj.fee ?? BigInt(0),
		module: obj.module ?? MODULE_NAME_INTEROPERABILITY,
		nonce: obj.nonce ?? BigInt(0),
		params: obj.params ?? encodedRegistrationParams,
		receivingChainID: obj.receivingChainID ?? MAINCHAIN_ID_BUFFER,
		sendingChainID: obj.sendingChainID ?? sidechainIDBuffer,
		status: obj.status ?? CCMStatusCode.OK,
	});

	const resetContext = (ccm: CCMsg): CrossChainMessageContext => {
		return createCrossChainMessageContext({
			ccm,
			chainID: sidechainIDBuffer,
		});
	};

	let ccm: CCMsg;
	let sampleExecuteContext: CrossChainMessageContext;
	let ccRegistrationCommand: MainchainCCRegistrationCommand;

	beforeEach(() => {
		ccm = buildCCM({});
		sampleExecuteContext = resetContext(ccm);

		channelStoreMock.get.mockResolvedValue(channelData);
		ownChainAccountStoreMock.get.mockResolvedValue(ownChainAccountMainchain);
		chainAccountStoreMock.get.mockResolvedValue(chainAccount);

		ccRegistrationCommand = new MainchainCCRegistrationCommand(
			interopMod.stores,
			interopMod.events,
			new Map(),
		);
	});

	describe('verify', () => {
		it('should fail if channel.inbox.size !== 0', async () => {
			channelStoreMock.get.mockResolvedValue({
				inbox: {
					size: 123,
				},
			});
			await expect(ccRegistrationCommand.verify(sampleExecuteContext)).rejects.toThrow(
				'Registration message must be the first message in the inbox.',
			);
		});

		it('should fail if ccm.status !== OK', async () => {
			sampleExecuteContext = resetContext(
				buildCCM({
					status: CCMStatusCode.FAILED_CCM,
				}),
			);
			await expect(ccRegistrationCommand.verify(sampleExecuteContext)).rejects.toThrow(
				'Registration message must have status OK.',
			);
		});

		it('should fail if ownChainAccount.chainID !== ccm.receivingChainID', async () => {
			sampleExecuteContext = resetContext(
				buildCCM({
					receivingChainID: Buffer.from('1000', 'hex'),
				}),
			);
			await expect(ccRegistrationCommand.verify(sampleExecuteContext)).rejects.toThrow(
				'Registration message must be sent to the chain account ID of the chain.',
			);
		});

		it('should fail if ownChainAccount.name !== ccmRegistrationParams.name', async () => {
			sampleExecuteContext = resetContext(
				buildCCM({
					params: codec.encode(registrationCCMParamsSchema, {
						name: 'Fake-Name',
						messageFeeTokenID: Buffer.from('0000000000000011', 'hex'),
					}),
				}),
			);
			await expect(ccRegistrationCommand.verify(sampleExecuteContext)).rejects.toThrow(
				'Registration message must contain the name of the registered chain.',
			);
		});

		it('should fail if channel.messageFeeTokenID !== ccmRegistrationParams.messageFeeTokenID', async () => {
			sampleExecuteContext = resetContext(
				buildCCM({
					params: codec.encode(registrationCCMParamsSchema, {
						name: ownChainAccountMainchain.name,
						messageFeeTokenID: Buffer.from('0000000000000012', 'hex'),
					}),
				}),
			);
			await expect(ccRegistrationCommand.verify(sampleExecuteContext)).rejects.toThrow(
				'Registration message must contain the same message fee token ID as the chain account.',
			);
		});

		it('should fail if chainID is Mainchain and nonce !== 0', async () => {
			sampleExecuteContext = resetContext(
				buildCCM({
					nonce: BigInt(1),
				}),
			);
			await expect(ccRegistrationCommand.verify(sampleExecuteContext)).rejects.toThrow(
				'Registration message must have nonce 0.',
			);
		});

		it('should fail if chainID is Sidechain and sendingChainID !== CHAIN_ID_MAINCHAIN', async () => {
			sampleExecuteContext = resetContext(
				buildCCM({
					receivingChainID: sidechainIDBuffer,
				}),
			);
			ownChainAccountStoreMock.get.mockResolvedValue({
				name: 'mainchain',
				chainID: sidechainIDBuffer,
				nonce: BigInt(0),
			});
			await expect(ccRegistrationCommand.verify(sampleExecuteContext)).rejects.toThrow(
				'Registration message must be sent from the mainchain.',
			);
		});

		it('should pass verify when all checks are fulfilled', async () => {
			await expect(ccRegistrationCommand.verify(sampleExecuteContext)).resolves.not.toThrow();
		});
	});
	describe('execute', () => {
		it('should execute successfully', async () => {
			await ccRegistrationCommand.execute(sampleExecuteContext);

			chainAccount.status = ChainStatus.ACTIVE;

			expect(chainAccountStoreMock.set).toHaveBeenCalledTimes(1);
			expect(chainAccountUpdatedEventMock.log).toHaveBeenCalledWith(
				sampleExecuteContext,
				ccm.sendingChainID,
				chainAccount,
			);
		});
	});
});
