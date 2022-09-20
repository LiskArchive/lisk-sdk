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
import { utils, bls } from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';
import {
	CCM_STATUS_OK,
	CHAIN_REGISTERED,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	EMPTY_FEE_ADDRESS,
	EMPTY_HASH,
	MAINCHAIN_ID_BUFFER,
	MAINCHAIN_NAME,
	MAINCHAIN_NETWORK_ID,
	MODULE_NAME_INTEROPERABILITY,
	NUMBER_MAINCHAIN_VALIDATORS,
	TAG_CHAIN_REG_MESSAGE,
	THRESHOLD_MAINCHAIN,
} from '../../constants';
import {
	mainchainRegParams,
	registrationCCMParamsSchema,
	registrationSignatureMessageSchema,
} from '../../schemas';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../../state_machine';
import { MainchainRegistrationParams, ActiveValidators } from '../../types';
import { computeValidatorsHash, isValidName, sortValidatorsByBLSKey } from '../../utils';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import { SidechainInteroperabilityStore } from '../store';
import { ChainAccountStore } from '../../stores/chain_account';
import { ChannelDataStore } from '../../stores/channel_data';
import { ChainValidatorsStore } from '../../stores/chain_validators';
import { OutboxRootStore } from '../../stores/outbox_root';
import { OwnChainAccountStore } from '../../stores/own_chain_account';
import { ImmutableStoreGetter, StoreGetter } from '../../../base_store';

export class MainchainRegistrationCommand extends BaseInteroperabilityCommand {
	public schema = mainchainRegParams;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<MainchainRegistrationParams>,
	): Promise<VerificationResult> {
		const { ownName, mainchainValidators, ownChainID } = context.params;

		if (ownChainID.length > 4) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(`Own chain id cannot be greater than maximum uint32 number.`),
			};
		}

		try {
			validator.validate(mainchainRegParams, context.params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
			};
		}

		if (!isValidName(ownName)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(`Sidechain name is in an unsupported format: ${ownName}`),
			};
		}

		for (let i = 0; i < NUMBER_MAINCHAIN_VALIDATORS; i += 1) {
			const currentValidator = mainchainValidators[i];

			if (
				mainchainValidators[i + 1] &&
				currentValidator.blsKey.compare(mainchainValidators[i + 1].blsKey) > -1
			) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Validators blsKeys must be unique and lexicographically ordered'),
				};
			}

			if (currentValidator.bftWeight !== BigInt(1)) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Validator bft weight must be equal to 1'),
				};
			}
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<MainchainRegistrationParams>): Promise<void> {
		const {
			chainID,
			currentValidators: validators,
			certificateThreshold,
			params: { ownChainID, ownName, mainchainValidators, aggregationBits, signature },
		} = context;
		const activeValidators: ActiveValidators[] = validators.filter(v => v.bftWeight > BigInt(0));
		const keyList: Buffer[] = [];
		const weights: bigint[] = [];
		sortValidatorsByBLSKey(activeValidators);
		for (const v of activeValidators) {
			keyList.push(v.blsKey);
			weights.push(v.bftWeight);
		}
		const message = codec.encode(registrationSignatureMessageSchema, {
			ownChainID,
			ownName,
			mainchainValidators,
		});
		bls.verifyWeightedAggSig(
			keyList,
			aggregationBits,
			signature,
			TAG_CHAIN_REG_MESSAGE,
			chainID,
			message,
			weights,
			certificateThreshold,
		);

		const chainSubstore = this.stores.get(ChainAccountStore);
		await chainSubstore.set(context, MAINCHAIN_ID_BUFFER, {
			name: MAINCHAIN_NAME,
			lastCertificate: {
				height: 0,
				timestamp: 0,
				stateRoot: EMPTY_HASH,
				validatorsHash: computeValidatorsHash(mainchainValidators, BigInt(THRESHOLD_MAINCHAIN)),
			},
			status: CHAIN_REGISTERED,
		});

		const channelSubstore = this.stores.get(ChannelDataStore);
		await channelSubstore.set(context, MAINCHAIN_ID_BUFFER, {
			inbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
			outbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
			partnerChainOutboxRoot: EMPTY_HASH,
			messageFeeTokenID: { chainID: MAINCHAIN_ID_BUFFER, localID: utils.intToBuffer(0, 4) },
		});

		const interoperabilityStore = this.getInteroperabilityStore(context);

		const encodedParams = codec.encode(registrationCCMParamsSchema, {
			networkID: MAINCHAIN_NETWORK_ID,
			name: MAINCHAIN_NAME,
			messageFeeTokenID: { chainID: MAINCHAIN_ID_BUFFER, localID: utils.intToBuffer(0, 4) },
		});

		await interoperabilityStore.sendInternal({
			module: MODULE_NAME_INTEROPERABILITY,
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
			receivingChainID: MAINCHAIN_ID_BUFFER,
			fee: BigInt(0),
			status: CCM_STATUS_OK,
			params: encodedParams,
			eventQueue: context.eventQueue,
			feeAddress: EMPTY_FEE_ADDRESS,
			getMethodContext: context.getMethodContext,
			getStore: context.getStore,
			logger: context.logger,
			chainID: context.chainID,
		});

		const chainValidatorsSubstore = this.stores.get(ChainValidatorsStore);
		await chainValidatorsSubstore.set(context, MAINCHAIN_ID_BUFFER, {
			activeValidators: mainchainValidators,
			certificateThreshold: BigInt(THRESHOLD_MAINCHAIN),
		});

		const outboxRootSubstore = this.stores.get(OutboxRootStore);
		await outboxRootSubstore.set(context, MAINCHAIN_ID_BUFFER, { root: EMPTY_HASH });

		const ownChainAccountSubstore = this.stores.get(OwnChainAccountStore);
		await ownChainAccountSubstore.set(context, utils.intToBuffer(0, 4), {
			name: ownName,
			id: ownChainID,
			nonce: BigInt(0),
		});
	}

	protected getInteroperabilityStore(
		context: StoreGetter | ImmutableStoreGetter,
	): SidechainInteroperabilityStore {
		return new SidechainInteroperabilityStore(this.stores, context, this.interoperableCCMethods);
	}
}
