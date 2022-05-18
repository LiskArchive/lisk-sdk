import { codec } from '@liskhq/lisk-codec';
import { CommandExecuteContext } from '../../../../node/state_machine';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import {
	COMMAND_ID_STATE_RECOVERY_INIT,
	EMPTY_BYTES,
	MODULE_ID_INTEROPERABILITY,
	STORE_PREFIX_TERMINATED_STATE,
} from '../../constants';
import { chainAccountSchema, stateRecoveryInitParams, terminatedStateSchema } from '../../schema';
import {
	ChainAccount,
	StateRecoveryInitParams,
	StoreCallback,
	TerminatedStateAccount,
} from '../../types';
import { getIDAsKeyForStore } from '../../utils';
import { MainchainInteroperabilityStore } from '../store';

export class StateRecoveryInitCommand extends BaseInteroperabilityCommand {
	public name = 'stateRecoveryInitialization';
	public id = COMMAND_ID_STATE_RECOVERY_INIT;
	public schema = stateRecoveryInitParams;

	public async execute(context: CommandExecuteContext<StateRecoveryInitParams>): Promise<void> {
		const { params, getStore } = context;
		const sidechainChainAccount = codec.decode<ChainAccount>(
			chainAccountSchema,
			params.sidechainChainAccount,
		);

		const interoperabilityStore = this.getInteroperabilityStore(getStore);

		const doesTerminatedStateAccountExist = await interoperabilityStore.hasTerminatedStateAccount(
			getIDAsKeyForStore(params.chainID),
		);
		if (doesTerminatedStateAccountExist) {
			const newTerminatedStateAccount: TerminatedStateAccount = {
				stateRoot: sidechainChainAccount.lastCertificate.stateRoot,
				mainchainStateRoot: EMPTY_BYTES,
				initialized: true,
			};

			const store = getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_TERMINATED_STATE);

			await store.setWithSchema(
				getIDAsKeyForStore(params.chainID),
				newTerminatedStateAccount,
				terminatedStateSchema,
			);
			return;
		}

		await interoperabilityStore.createTerminatedStateAccount(
			params.chainID,
			sidechainChainAccount.lastCertificate.stateRoot,
		);
	}

	protected getInteroperabilityStore(getStore: StoreCallback): MainchainInteroperabilityStore {
		return new MainchainInteroperabilityStore(this.moduleID, getStore, this.interoperableCCAPIs);
	}
}
