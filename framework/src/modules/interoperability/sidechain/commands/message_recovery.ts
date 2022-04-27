import { codec } from '@liskhq/lisk-codec';
import { CommandExecuteContext, VerificationResult } from '../../../../node/state_machine';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import { COMMAND_ID_MESSAGE_RECOVERY, EMPTY_FEE_ADDRESS } from '../../constants';
import { createCCCommandExecuteContext } from '../../context';
import { ccmSchema, messageRecoveryParams } from '../../schema';
import { CCMsg, StoreCallback, MessageRecoveryParams } from '../../types';
import { swapChainIDs } from '../../utils';
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
		const { params, getAPIContext, logger, networkIdentifier, getStore } = context;
		const apiContext = getAPIContext();
		const { eventQueue } = apiContext;

		const deserializedCCMs = params.crossChainMessages.map(serializedCcm =>
			codec.decode<CCMsg>(ccmSchema, serializedCcm),
		);

		const interoperabilityStore = this.getInteroperabilityStore(getStore);
		const ownChainAccount = await interoperabilityStore.getOwnChainAccount();
		for (const ccm of deserializedCCMs) {
			const newCcm = swapChainIDs(ccm);

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
