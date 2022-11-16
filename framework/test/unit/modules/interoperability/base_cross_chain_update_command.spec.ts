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
/* eslint-disable max-classes-per-file */
import { utils } from '@liskhq/lisk-cryptography';
import { CommandExecuteContext, MainchainInteroperabilityModule } from '../../../../src';
import { BaseCCCommand } from '../../../../src/modules/interoperability/base_cc_command';
import { BaseCrossChainUpdateCommand } from '../../../../src/modules/interoperability/base_cross_chain_update_command';
import { BaseInteroperabilityInternalMethod } from '../../../../src/modules/interoperability/base_interoperability_internal_methods';
import { BaseCCMethod } from '../../../../src/modules/interoperability/base_cc_method';
import { CCMStatusCode, MIN_RETURN_FEE } from '../../../../src/modules/interoperability/constants';
import {
	CCMProcessedCode,
	CcmProcessedEvent,
	CCMProcessedResult,
} from '../../../../src/modules/interoperability/events/ccm_processed';
import { CcmSendSuccessEvent } from '../../../../src/modules/interoperability/events/ccm_send_success';
import { MainchainInteroperabilityInternalMethod } from '../../../../src/modules/interoperability/mainchain/internal_method';
import { CrossChainMessageContext } from '../../../../src/modules/interoperability/types';
import { createCrossChainMessageContext } from '../../../../src/testing';

class CrossChainUpdateCommand extends BaseCrossChainUpdateCommand {
	// eslint-disable-next-line @typescript-eslint/require-await
	public async execute(_context: CommandExecuteContext<unknown>): Promise<void> {
		throw new Error('Method not implemented.');
	}
	protected getInteroperabilityInternalMethod(): BaseInteroperabilityInternalMethod {
		return new MainchainInteroperabilityInternalMethod(this.stores, this.events, new Map());
	}
}

describe('BaseCrossChainUpdateCommand', () => {
	const defaultCCM = {
		nonce: BigInt(0),
		module: 'token',
		crossChainCommand: 'crossChainTransfer',
		sendingChainID: Buffer.from([0, 0, 2, 0]),
		receivingChainID: Buffer.from([0, 0, 3, 0]),
		fee: BigInt(20000),
		status: 0,
		params: Buffer.alloc(0),
	};
	let context: CrossChainMessageContext;
	let command: CrossChainUpdateCommand;
	let ccMethods: Map<string, BaseCCMethod>;
	let ccCommands: Map<string, BaseCCCommand[]>;
	let internalMethod: BaseInteroperabilityInternalMethod;

	beforeEach(() => {
		const interopModule = new MainchainInteroperabilityModule();
		ccMethods = new Map();
		ccMethods.set(
			'token',
			new (class TokenMethod extends BaseCCMethod {
				public verifyCrossChainMessage = jest.fn();
				public beforeCrossChainCommandExecute = jest.fn();
				public afterCrossChainCommandExecute = jest.fn();
			})(interopModule.stores, interopModule.events),
		);
		ccCommands = new Map();
		ccCommands.set('token', [
			new (class CrossChainTransfer extends BaseCCCommand {
				public schema = { $id: 'test/ccu', properties: {}, type: 'object' };
				public verify = jest.fn();
				public execute = jest.fn();
			})(interopModule.stores, interopModule.events),
		]);
		command = new CrossChainUpdateCommand(
			interopModule.stores,
			interopModule.events,
			ccMethods,
			ccCommands,
		);
		internalMethod = ({
			isLive: jest.fn().mockResolvedValue(true),
			addToOutbox: jest.fn(),
			terminateChainInternal: jest.fn(),
		} as unknown) as BaseInteroperabilityInternalMethod;
		jest
			.spyOn(command, 'getInteroperabilityInternalMethod' as never)
			.mockReturnValue(internalMethod as never);
		jest.spyOn(command['events'].get(CcmProcessedEvent), 'log');
		jest.spyOn(command['events'].get(CcmSendSuccessEvent), 'log');
		context = createCrossChainMessageContext({
			ccm: defaultCCM,
		});
	});

	describe('apply', () => {
		it('should terminate the chain and log event when sending chain is not live', async () => {
			(internalMethod.isLive as jest.Mock).mockResolvedValue(false);

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
			);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should terminate the chain and log event when verifyCrossChainMessage fails', async () => {
			((ccMethods.get('token') as BaseCCMethod)
				.verifyCrossChainMessage as jest.Mock).mockRejectedValue('error');
			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
			);
			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should bounce if the module is not registered', async () => {
			jest.spyOn(command, 'bounce' as never).mockResolvedValue(undefined as never);
			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					module: 'nonExisting',
				},
			});

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(command['bounce']).toHaveBeenCalledTimes(1);
		});

		it('should bounce if the command is not registered', async () => {
			jest.spyOn(command, 'bounce' as never).mockResolvedValue(undefined as never);
			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					crossChainCommand: 'nonExisting',
				},
			});

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(command['bounce']).toHaveBeenCalledTimes(1);
		});

		it('should terminate the chain and log event when command verify fails', async () => {
			(((ccCommands.get(defaultCCM.module) as BaseCCCommand[]).find(
				com => com.name === defaultCCM.crossChainCommand,
			) as BaseCCCommand).verify as jest.Mock).mockRejectedValue('error');

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
			);
			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.INVALID_CCM_VALIDATION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should terminate the chain and log event when command beforeCrossChainCommandExecute fails', async () => {
			((ccMethods.get('token') as BaseCCMethod)
				.beforeCrossChainCommandExecute as jest.Mock).mockRejectedValue('error');

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
			);
			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.INVALID_CCM_BEFORE_CCC_EXECUTION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should revert to the original state/event when command beforeCrossChainCommandExecute fails', async () => {
			((ccMethods.get('token') as BaseCCMethod)
				.beforeCrossChainCommandExecute as jest.Mock).mockRejectedValue('error');
			jest.spyOn(context.eventQueue, 'createSnapshot').mockReturnValue(99);
			jest.spyOn(context.stateStore, 'createSnapshot').mockReturnValue(10);
			jest.spyOn(context.eventQueue, 'restoreSnapshot');
			jest.spyOn(context.stateStore, 'restoreSnapshot');

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.restoreSnapshot).toHaveBeenCalledWith(99);
			expect(context.stateStore.restoreSnapshot).toHaveBeenCalledWith(10);
		});

		it('should bounce, log event and restore the state/event before calling execute when execute fails', async () => {
			(((ccCommands.get(defaultCCM.module) as BaseCCCommand[]).find(
				com => com.name === defaultCCM.crossChainCommand,
			) as BaseCCCommand).execute as jest.Mock).mockRejectedValue('error');
			jest.spyOn(command, 'bounce' as never).mockResolvedValue(undefined as never);
			let eventQueueCount = 0;
			let stateStoreCount = 0;
			jest.spyOn(context.eventQueue, 'createSnapshot').mockImplementation(() => {
				eventQueueCount += 1;
				return eventQueueCount;
			});
			jest.spyOn(context.stateStore, 'createSnapshot').mockImplementation(() => {
				stateStoreCount += 1;
				return stateStoreCount;
			});
			jest.spyOn(context.eventQueue, 'restoreSnapshot');
			jest.spyOn(context.stateStore, 'restoreSnapshot');

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.restoreSnapshot).toHaveBeenCalledWith(2);
			expect(context.stateStore.restoreSnapshot).toHaveBeenCalledWith(2);
			expect(
				(ccMethods.get('token') as BaseCCMethod).afterCrossChainCommandExecute as jest.Mock,
			).toHaveBeenCalledTimes(1);
			expect(command['bounce']).toHaveBeenCalledTimes(1);
		});

		it('should terminate the chain and log event when command afterCrossChainCommandExecute fails', async () => {
			((ccMethods.get('token') as BaseCCMethod)
				.afterCrossChainCommandExecute as jest.Mock).mockRejectedValue('error');

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
			);
			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.INVALID_CCM_AFTER_CCC_EXECUTION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should restore the original state/event when command afterCrossChainCommandExecute fails', async () => {
			((ccMethods.get('token') as BaseCCMethod)
				.afterCrossChainCommandExecute as jest.Mock).mockRejectedValue('error');
			jest.spyOn(context.eventQueue, 'createSnapshot').mockReturnValue(99);
			jest.spyOn(context.stateStore, 'createSnapshot').mockReturnValue(10);
			jest.spyOn(context.eventQueue, 'restoreSnapshot');
			jest.spyOn(context.stateStore, 'restoreSnapshot');

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.restoreSnapshot).toHaveBeenCalledWith(99);
			expect(context.stateStore.restoreSnapshot).toHaveBeenCalledWith(10);
		});

		it('call all the hooks if defined', async () => {
			const ccMethod = ccMethods.get('token');
			const ccCommand = ccCommands
				.get(defaultCCM.module)
				?.find(com => com.name === defaultCCM.crossChainCommand);

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(ccMethod?.verifyCrossChainMessage).toHaveBeenCalledTimes(1);
			expect(ccMethod?.beforeCrossChainCommandExecute).toHaveBeenCalledTimes(1);
			expect(ccMethod?.afterCrossChainCommandExecute).toHaveBeenCalledTimes(1);
			expect(ccCommand?.verify).toHaveBeenCalledTimes(1);
			expect(ccCommand?.execute).toHaveBeenCalledTimes(1);
		});
	});

	describe('bounce', () => {
		const ccmStatus = CCMStatusCode.MODULE_NOT_SUPPORTED;
		const ccmProcessedEventCode = CCMProcessedCode.MODULE_NOT_SUPPORTED;
		it('should log event when status is not ok', async () => {
			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					status: CCMStatusCode.MODULE_NOT_SUPPORTED,
				},
			});

			await expect(
				command['bounce'](context, utils.getRandomBytes(32), 100, ccmStatus, ccmProcessedEventCode),
			).resolves.toBeUndefined();

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccmID: expect.any(Buffer),
					code: ccmProcessedEventCode,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should log event when ccm.fee is less than min fee', async () => {
			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					status: CCMStatusCode.OK,
					fee: BigInt(1),
				},
			});

			await expect(
				command['bounce'](context, utils.getRandomBytes(32), 100, ccmStatus, ccmProcessedEventCode),
			).resolves.toBeUndefined();

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccmID: expect.any(Buffer),
					code: ccmProcessedEventCode,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should add returning ccm to the sending chain', async () => {
			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					status: CCMStatusCode.OK,
					fee: BigInt(100000000000),
				},
			});

			await expect(
				command['bounce'](context, utils.getRandomBytes(32), 100, ccmStatus, ccmProcessedEventCode),
			).resolves.toBeUndefined();

			expect(internalMethod.addToOutbox).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				{
					...defaultCCM,
					status: ccmStatus,
					sendingChainID: defaultCCM.receivingChainID,
					receivingChainID: defaultCCM.sendingChainID,
					fee: context.ccm.fee - BigInt(100) * MIN_RETURN_FEE,
				},
			);
		});

		it('should log the event with the new boucing ccm', async () => {
			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					status: CCMStatusCode.OK,
					fee: BigInt(100000000000),
				},
			});

			await expect(
				command['bounce'](context, utils.getRandomBytes(32), 100, ccmStatus, ccmProcessedEventCode),
			).resolves.toBeUndefined();

			expect(context.eventQueue.getEvents()).toHaveLength(2);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccmID: expect.any(Buffer),
					code: ccmProcessedEventCode,
					result: CCMProcessedResult.BOUNCED,
				},
			);
			expect(command['events'].get(CcmSendSuccessEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm.sendingChainID,
				expect.any(Buffer),
				{
					ccmID: expect.any(Buffer),
				},
			);
		});
	});
});
