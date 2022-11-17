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
import { BaseInteroperabilityCommand } from './base_interoperability_command';
import { BaseInteroperabilityInternalMethod } from './base_interoperability_internal_methods';
import { BaseInteroperabilityMethod } from './base_interoperability_method';
import { CCMStatusCode, MIN_RETURN_FEE } from './constants';
import { CCMProcessedCode, CcmProcessedEvent, CCMProcessedResult } from './events/ccm_processed';
import { CcmSendSuccessEvent } from './events/ccm_send_success';
import { ccmSchema, crossChainUpdateTransactionParams } from './schemas';
import { CrossChainMessageContext, TokenMethod } from './types';

export abstract class BaseCrossChainUpdateCommand<
	T extends BaseInteroperabilityInternalMethod
> extends BaseInteroperabilityCommand<T> {
	public schema = crossChainUpdateTransactionParams;

	protected _tokenMethod!: TokenMethod;
	protected _interopsMethod!: BaseInteroperabilityMethod<T>;

	public init(interopsMethod: BaseInteroperabilityMethod<T>, tokenMethod: TokenMethod) {
		this._tokenMethod = tokenMethod;
		this._interopsMethod = interopsMethod;
	}

	protected async apply(context: CrossChainMessageContext): Promise<void> {
		const { ccm, logger } = context;
		const encodedCCM = codec.encode(ccmSchema, ccm);
		const ccmID = utils.hash(encodedCCM);
		const valid = await this.verifyCCM(context, ccmID);
		if (!valid) {
			return;
		}
		const commands = this.ccCommands.get(ccm.module);
		if (!commands) {
			await this.bounce(
				context,
				ccmID,
				encodedCCM.length,
				CCMStatusCode.MODULE_NOT_SUPPORTED,
				CCMProcessedCode.MODULE_NOT_SUPPORTED,
			);
			return;
		}
		const command = commands.find(com => com.name === ccm.crossChainCommand);
		if (!command) {
			await this.bounce(
				context,
				ccmID,
				encodedCCM.length,
				CCMStatusCode.CROSS_CHAIN_COMMAND_NOT_SUPPORTED,
				CCMProcessedCode.CROSS_CHAIN_COMMAND_NOT_SUPPORTED,
			);
			return;
		}
		if (command.verify) {
			try {
				await command.verify(context);
			} catch (error) {
				logger.info(
					{ err: error as Error, moduleName: module, commandName: ccm.crossChainCommand },
					'Fail to verify cross chain command.',
				);
				await this.internalMethod.terminateChainInternal(context, ccm.sendingChainID);
				this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
					ccmID,
					code: CCMProcessedCode.INVALID_CCM_VALIDATION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				});
				return;
			}
		}
		const baseEventSnapshotID = context.eventQueue.createSnapshot();
		const baseStateSnapshotID = context.stateStore.createSnapshot();

		try {
			for (const [module, method] of this.interoperableCCMethods.entries()) {
				if (method.beforeCrossChainCommandExecute) {
					logger.debug(
						{
							moduleName: module,
							commandName: ccm.crossChainCommand,
							ccmID: ccmID.toString('hex'),
						},
						'Execute beforeCrossChainCommandExecute',
					);
					await method.beforeCrossChainCommandExecute(context);
				}
			}
		} catch (error) {
			context.eventQueue.restoreSnapshot(baseEventSnapshotID);
			context.stateStore.restoreSnapshot(baseStateSnapshotID);
			logger.info(
				{ err: error as Error, moduleName: ccm.module, commandName: ccm.crossChainCommand },
				'Fail to execute beforeCrossChainCommandExecute.',
			);
			await this.internalMethod.terminateChainInternal(context, ccm.sendingChainID);
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccmID,
				code: CCMProcessedCode.INVALID_CCM_BEFORE_CCC_EXECUTION_EXCEPTION,
				result: CCMProcessedResult.DISCARDED,
			});
			return;
		}

		const execEventSnapshotID = context.eventQueue.createSnapshot();
		const execStateSnapshotID = context.stateStore.createSnapshot();

		try {
			const params = command.schema ? codec.decode(command.schema, context.ccm.params) : {};
			await command.execute({ ...context, params });
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccmID,
				code: CCMProcessedCode.SUCCESS,
				result: CCMProcessedResult.APPLIED,
			});
		} catch (error) {
			context.eventQueue.restoreSnapshot(execEventSnapshotID);
			context.stateStore.restoreSnapshot(execStateSnapshotID);
			await this.bounce(
				context,
				ccmID,
				encodedCCM.length,
				CCMStatusCode.FAILED_CCM,
				CCMProcessedCode.FAILED_CCM,
			);
		}

		try {
			for (const [module, method] of this.interoperableCCMethods.entries()) {
				if (method.afterCrossChainCommandExecute) {
					logger.debug(
						{
							moduleName: module,
							commandName: ccm.crossChainCommand,
							ccmID: ccmID.toString('hex'),
						},
						'Execute afterCrossChainCommandExecute',
					);
					await method.afterCrossChainCommandExecute(context);
				}
			}
		} catch (error) {
			context.eventQueue.restoreSnapshot(baseEventSnapshotID);
			context.stateStore.restoreSnapshot(baseStateSnapshotID);
			logger.info(
				{ err: error as Error, moduleName: module, commandName: ccm.crossChainCommand },
				'Fail to execute afterCrossChainCommandExecute',
			);
			await this.internalMethod.terminateChainInternal(context, ccm.sendingChainID);
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccmID,
				code: CCMProcessedCode.INVALID_CCM_AFTER_CCC_EXECUTION_EXCEPTION,
				result: CCMProcessedResult.DISCARDED,
			});
		}
	}

	protected async bounce(
		context: CrossChainMessageContext,
		ccmID: Buffer,
		ccmSize: number,
		ccmStatusCode: CCMStatusCode,
		ccmProcessedCode: CCMProcessedCode,
	): Promise<void> {
		const { ccm } = context;
		const minFee = MIN_RETURN_FEE * BigInt(ccmSize);
		if (ccm.status !== CCMStatusCode.OK || ccm.fee < minFee) {
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccmID,
				code: ccmProcessedCode,
				result: CCMProcessedResult.DISCARDED,
			});
			return;
		}
		this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
			ccmID,
			code: ccmProcessedCode,
			result: CCMProcessedResult.BOUNCED,
		});
		const bouncedCCM = {
			...ccm,
			status: ccmStatusCode,
			sendingChainID: ccm.receivingChainID,
			receivingChainID: ccm.sendingChainID,
			fee: ccmStatusCode === CCMStatusCode.FAILED_CCM ? BigInt(0) : ccm.fee - minFee,
		};
		await this.internalMethod.addToOutbox(context, bouncedCCM.receivingChainID, bouncedCCM);
		const newCCMID = utils.hash(codec.encode(ccmSchema, bouncedCCM));
		this.events
			.get(CcmSendSuccessEvent)
			.log(context, bouncedCCM.sendingChainID, bouncedCCM.receivingChainID, newCCMID, {
				ccmID: newCCMID,
			});
	}

	protected async verifyCCM(context: CrossChainMessageContext, ccmID: Buffer): Promise<boolean> {
		const { ccm, logger } = context;
		try {
			const isLive = await this.internalMethod.isLive(context, ccm.sendingChainID);
			if (!isLive) {
				throw new Error(`Sending chain ${ccm.sendingChainID.toString('hex')} is not live.`);
			}
			for (const [module, method] of this.interoperableCCMethods.entries()) {
				if (method.verifyCrossChainMessage) {
					logger.debug({ module, ccmID: ccmID.toString('hex') }, 'verifying cross chain message');
					await method.verifyCrossChainMessage(context);
				}
			}
			return true;
		} catch (error) {
			logger.info(
				{ err: error as Error, moduleName: module, commandName: ccm.crossChainCommand },
				'Fail to verify cross chain message.',
			);
			await this.internalMethod.terminateChainInternal(context, ccm.sendingChainID);
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccmID,
				code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
				result: CCMProcessedResult.DISCARDED,
			});
			return false;
		}
	}
}
