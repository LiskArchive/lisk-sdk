import { objects as objectUtils } from '@liskhq/lisk-utils';
import { codec } from '@liskhq/lisk-codec';
import { BaseInteroperabilityCommand } from './base_interoperability_command';
import { VerifyStatus, VerificationResult, CommandExecuteContext } from '../../state_machine';
import {
	RegistrationParametersValidator,
	ChannelData,
	InboxOutbox,
	MainchainRegistrationParams,
	SidechainRegistrationParams,
	CCMsg,
	OwnChainAccount,
} from './types';
import {
	MAX_UINT64,
	EMPTY_HASH,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
	MODULE_NAME_INTEROPERABILITY,
	CROSS_CHAIN_COMMAND_REGISTRATION,
	CCMStatusCode,
} from './constants';
import { computeValidatorsHash } from './utils';
import { ChainStatus, ChainAccount, ChainAccountStore } from './stores/chain_account';
import { BaseInteroperabilityInternalMethod } from './base_interoperability_internal_methods';
import { ChainValidatorsStore } from './stores/chain_validators';
import { ChannelDataStore } from './stores/channel_data';
import { OutboxRootStore } from './stores/outbox_root';
import { registrationCCMParamsSchema } from './schemas';

export abstract class BaseRegisterChainCommand<
	T extends BaseInteroperabilityInternalMethod,
> extends BaseInteroperabilityCommand<T> {
	// Verifies chain validators
	protected verifyValidators(
		validators: RegistrationParametersValidator[],
		certificateThreshold: bigint,
	): VerificationResult {
		const blsKeys = validators.map(validator => validator.blsKey);
		// All validator keys must be distinct.
		if (!objectUtils.bufferArrayUniqueItems(blsKeys)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Duplicate BLS keys.'),
			};
		}

		// Validator keys must be in lexicographic order.
		if (!objectUtils.isBufferArrayOrdered(blsKeys)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Validator keys should be sorted lexicographically.'),
			};
		}

		let totalBftWeight = BigInt(0);
		for (const validator of validators) {
			// The bftWeight property of each element is a positive integer.
			if (validator.bftWeight <= 0) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Validator bft weight must be a positive integer.'),
				};
			}
			totalBftWeight += validator.bftWeight;
			//  Total BFT weight has to be less than or equal to MAX_UINT64.
			if (totalBftWeight > MAX_UINT64) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error(`Total BFT weight has to be less than or equal to ${MAX_UINT64}.`),
				};
			}
		}

		// Minimum value: floor(1/3 * total BFT weight) + 1
		// Note: BigInt truncates to floor
		const minCertificateThreshold = totalBftWeight / BigInt(3) + BigInt(1);
		if (certificateThreshold < minCertificateThreshold) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					`Certificate threshold is too small. Minimum value: ${minCertificateThreshold}.`,
				),
			};
		}
		if (certificateThreshold > totalBftWeight) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(`Certificate threshold is too large. Maximum value: ${totalBftWeight}.`),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	protected buildChainAccount(
		name: string,
		validators: RegistrationParametersValidator[],
		certificateThreshold: bigint,
	): ChainAccount {
		return {
			name,
			lastCertificate: {
				height: 0,
				timestamp: 0,
				stateRoot: EMPTY_HASH,
				validatorsHash: computeValidatorsHash(validators, certificateThreshold),
			},
			status: ChainStatus.REGISTERED,
		};
	}

	protected async saveChainAccount(
		context: CommandExecuteContext<MainchainRegistrationParams | SidechainRegistrationParams>,
		chainID: Buffer,
		chainAccount: ChainAccount,
	) {
		const chainAccountStore = this.stores.get(ChainAccountStore);
		await chainAccountStore.set(context, chainID, chainAccount);
	}

	protected buildChannelData(mainchainTokenID: Buffer): ChannelData {
		const inboxOutbox: InboxOutbox = { appendPath: [], size: 0, root: EMPTY_HASH };
		return {
			inbox: inboxOutbox,
			outbox: inboxOutbox,
			partnerChainOutboxRoot: EMPTY_HASH,
			messageFeeTokenID: mainchainTokenID,
			minReturnFeePerByte: MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
		};
	}

	protected async saveChannelData(
		context: CommandExecuteContext<MainchainRegistrationParams | SidechainRegistrationParams>,
		chainID: Buffer,
		channelData: ChannelData,
	) {
		const channelDataStore = this.stores.get(ChannelDataStore);
		await channelDataStore.set(context, chainID, channelData);
	}

	protected async saveChainValidators(
		context: CommandExecuteContext<MainchainRegistrationParams | SidechainRegistrationParams>,
		chainID: Buffer,
		validators: RegistrationParametersValidator[],
		certificateThreshold: bigint,
	) {
		const chainValidatorsSubstore = this.stores.get(ChainValidatorsStore);
		await chainValidatorsSubstore.set(context, chainID, {
			activeValidators: validators,
			certificateThreshold,
		});
	}

	protected async saveOutboxRoot(
		context: CommandExecuteContext<MainchainRegistrationParams | SidechainRegistrationParams>,
		chainID: Buffer,
		outboxRoot: Buffer,
	) {
		const outboxRootSubstore = this.stores.get(OutboxRootStore);
		await outboxRootSubstore.set(context, chainID, { root: outboxRoot });
	}

	protected buildEncodedParams(name: string, chainID: Buffer, messageFeeTokenID: Buffer): Buffer {
		return codec.encode(registrationCCMParamsSchema, {
			name,
			chainID,
			messageFeeTokenID,
			minReturnFeePerByte: MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
		});
	}

	protected buildCCM(
		ownChainAccount: OwnChainAccount,
		receivingChainID: Buffer,
		encodedParams: Buffer,
	): CCMsg {
		return {
			nonce: ownChainAccount.nonce,
			module: MODULE_NAME_INTEROPERABILITY,
			crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
			sendingChainID: ownChainAccount.chainID,
			receivingChainID,
			fee: BigInt(0),
			status: CCMStatusCode.OK,
			params: encodedParams,
		};
	}
}
