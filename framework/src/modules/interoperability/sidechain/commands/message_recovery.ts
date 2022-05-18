import { codec } from '@liskhq/lisk-codec';
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { hash } from '@liskhq/lisk-cryptography';
import { CommandExecuteContext, VerificationResult } from '../../../../node/state_machine';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import { BaseInteroperableAPI } from '../../base_interoperable_api';
import {
	CCM_STATUS_RECOVERED,
	COMMAND_ID_MESSAGE_RECOVERY,
	EMPTY_FEE_ADDRESS,
} from '../../constants';
import { createCCCommandExecuteContext } from '../../context';
import { ccmSchema, messageRecoveryParams } from '../../schema';
import { CCMsg, StoreCallback, MessageRecoveryParams } from '../../types';
import { getIDAsKeyForStore, swapReceivingAndSendingChainIDs } from '../../utils';
import { SidechainInteroperabilityStore } from '../store';

export class MessageRecoveryCommand extends BaseInteroperabilityCommand {
	public id = COMMAND_ID_MESSAGE_RECOVERY;
	public name = 'messageRecovery';
	public schema = messageRecoveryParams;

	// TODO
	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(): Promise<VerificationResult> {
		throw new Error('Method not implemented.');
	}

	public async execute(context: CommandExecuteContext<MessageRecoveryParams>): Promise<void> {
		const { transaction, params, getAPIContext, logger, networkIdentifier, getStore } = context;
		const apiContext = getAPIContext();
		const { eventQueue } = apiContext;

		const chainIdAsBuffer = getIDAsKeyForStore(params.chainID);

		const updatedCCMs: Buffer[] = [];
		const deserializedCCMs = params.crossChainMessages.map(serializedCCMsg =>
			codec.decode<CCMsg>(ccmSchema, serializedCCMsg),
		);
		for (const ccm of deserializedCCMs) {
			const apisWithBeforeRecoverCCM = [...this.interoperableCCAPIs.values()].filter(api =>
				Reflect.has(api, 'beforeRecoverCCM'),
			) as Pick<Required<BaseInteroperableAPI>, 'beforeRecoverCCM'>[];
			for (const api of apisWithBeforeRecoverCCM) {
				await api.beforeRecoverCCM({
					ccm,
					trsSender: transaction.senderAddress,
					eventQueue: apiContext.eventQueue,
					getAPIContext,
					logger,
					networkIdentifier,
					getStore,
					feeAddress: EMPTY_FEE_ADDRESS,
				});
			}

			const recoveryCCM: CCMsg = {
				...ccm,
				fee: BigInt(0),
				status: CCM_STATUS_RECOVERED,
			};
			const encodedUpdatedCCM = codec.encode(ccmSchema, recoveryCCM);
			updatedCCMs.push(encodedUpdatedCCM);
		}

		const interoperabilityStore = this.getInteroperabilityStore(getStore);

		const doesTerminatedOutboxAccountExist = await interoperabilityStore.terminatedOutboxAccountExist(
			chainIdAsBuffer,
		);

		if (!doesTerminatedOutboxAccountExist) {
			throw new Error('Terminated outbox account does not exist.');
		}

		const terminatedChainOutboxAccount = await interoperabilityStore.getTerminatedOutboxAccount(
			chainIdAsBuffer,
		);
		const terminatedChainOutboxSize = terminatedChainOutboxAccount.outboxSize;

		const proof = {
			size: terminatedChainOutboxSize,
			indexes: params.idxs,
			siblingHashes: params.siblingHashes,
		};

		const hashedUpdatedCCMs = updatedCCMs.map(ccm => hash(ccm));

		const outboxRoot = regularMerkleTree.calculateRootFromUpdateData(hashedUpdatedCCMs, proof);

		await interoperabilityStore.setTerminatedOutboxAccount(chainIdAsBuffer, {
			outboxRoot,
		});

		const ownChainAccount = await interoperabilityStore.getOwnChainAccount();
		for (const ccm of deserializedCCMs) {
			const newCcm = swapReceivingAndSendingChainIDs(ccm);

			if (ownChainAccount.id !== newCcm.receivingChainID) {
				continue;
			}

			const ccCommands = this.ccCommands.get(newCcm.moduleID);

			if (!ccCommands) {
				continue;
			}

			const ccCommand = ccCommands.find(command => command.ID === newCcm.crossChainCommandID);

			if (!ccCommand) {
				continue;
			}

			const ccCommandExecuteContext = createCCCommandExecuteContext({
				ccm: newCcm,
				eventQueue,
				feeAddress: EMPTY_FEE_ADDRESS,
				getAPIContext,
				getStore,
				logger,
				networkIdentifier,
			});

			await ccCommand.execute(ccCommandExecuteContext);
		}
	}

	protected getInteroperabilityStore(getStore: StoreCallback): SidechainInteroperabilityStore {
		return new SidechainInteroperabilityStore(this.moduleID, getStore, this.interoperableCCAPIs);
	}
}
