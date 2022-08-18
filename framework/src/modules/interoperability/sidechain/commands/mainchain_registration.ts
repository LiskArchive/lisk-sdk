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
	COMMAND_ID_MAINCHAIN_REG_BUFFER,
	CROSS_CHAIN_COMMAND_ID_REGISTRATION_BUFFER,
	EMPTY_FEE_ADDRESS,
	EMPTY_HASH,
	MAINCHAIN_ID_BUFFER,
	MAINCHAIN_NAME,
	MAINCHAIN_NETWORK_ID,
	MODULE_ID_INTEROPERABILITY_BUFFER,
	NUMBER_MAINCHAIN_VALIDATORS,
	STORE_PREFIX_CHAIN_DATA,
	STORE_PREFIX_CHAIN_VALIDATORS,
	STORE_PREFIX_CHANNEL_DATA,
	STORE_PREFIX_OUTBOX_ROOT,
	STORE_PREFIX_OWN_CHAIN_DATA,
	TAG_CHAIN_REG_MESSAGE,
	THRESHOLD_MAINCHAIN,
} from '../../constants';
import {
	chainAccountSchema,
	channelSchema,
	mainchainRegParams,
	outboxRootSchema,
	ownChainAccountSchema,
	registrationCCMParamsSchema,
	registrationSignatureMessageSchema,
	validatorsSchema,
} from '../../schemas';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../../state_machine';
import { MainchainRegistrationParams, StoreCallback, ActiveValidators } from '../../types';
import { computeValidatorsHash, isValidName, sortValidatorsByBLSKey } from '../../utils';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import { SidechainInteroperabilityStore } from '../store';

export class MainchainRegistrationCommand extends BaseInteroperabilityCommand {
	public id = COMMAND_ID_MAINCHAIN_REG_BUFFER;
	public name = 'mainchainRegistration';
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
			networkIdentifier,
			getStore,
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
			networkIdentifier,
			message,
			weights,
			certificateThreshold,
		);

		const chainSubstore = getStore(this.moduleID, STORE_PREFIX_CHAIN_DATA);
		await chainSubstore.setWithSchema(
			MAINCHAIN_ID_BUFFER,
			{
				name: MAINCHAIN_NAME,
				networkID: MAINCHAIN_NETWORK_ID,
				lastCertificate: {
					height: 0,
					timestamp: 0,
					stateRoot: EMPTY_HASH,
					validatorsHash: computeValidatorsHash(mainchainValidators, BigInt(THRESHOLD_MAINCHAIN)),
				},
				status: CHAIN_REGISTERED,
			},
			chainAccountSchema,
		);

		const channelSubstore = getStore(this.moduleID, STORE_PREFIX_CHANNEL_DATA);
		await channelSubstore.setWithSchema(
			MAINCHAIN_ID_BUFFER,
			{
				inbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
				outbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
				partnerChainOutboxRoot: EMPTY_HASH,
				messageFeeTokenID: { chainID: MAINCHAIN_ID_BUFFER, localID: utils.intToBuffer(0, 4) },
			},
			channelSchema,
		);

		const interoperabilityStore = this.getInteroperabilityStore(getStore);

		const encodedParams = codec.encode(registrationCCMParamsSchema, {
			networkID: MAINCHAIN_NETWORK_ID,
			name: MAINCHAIN_NAME,
			messageFeeTokenID: { chainID: MAINCHAIN_ID_BUFFER, localID: utils.intToBuffer(0, 4) },
		});

		await interoperabilityStore.sendInternal({
			moduleID: MODULE_ID_INTEROPERABILITY_BUFFER,
			crossChainCommandID: CROSS_CHAIN_COMMAND_ID_REGISTRATION_BUFFER,
			receivingChainID: MAINCHAIN_ID_BUFFER,
			fee: BigInt(0),
			status: CCM_STATUS_OK,
			params: encodedParams,
			eventQueue: context.eventQueue,
			feeAddress: EMPTY_FEE_ADDRESS,
			getAPIContext: context.getAPIContext,
			getStore: context.getStore,
			logger: context.logger,
			networkIdentifier: context.networkIdentifier,
		});

		const chainValidatorsSubstore = getStore(this.moduleID, STORE_PREFIX_CHAIN_VALIDATORS);
		await chainValidatorsSubstore.setWithSchema(
			MAINCHAIN_ID_BUFFER,
			{
				mainchainValidators: {
					activeValidators: mainchainValidators,
					certificateThreshold: BigInt(THRESHOLD_MAINCHAIN),
				},
			},
			validatorsSchema,
		);

		const outboxRootSubstore = getStore(this.moduleID, STORE_PREFIX_OUTBOX_ROOT);
		await outboxRootSubstore.setWithSchema(
			MAINCHAIN_ID_BUFFER,
			{ root: EMPTY_HASH },
			outboxRootSchema,
		);

		const ownChainAccountSubstore = getStore(this.moduleID, STORE_PREFIX_OWN_CHAIN_DATA);
		await ownChainAccountSubstore.setWithSchema(
			utils.intToBuffer(0, 4),
			{ name: ownName, id: ownChainID, nonce: BigInt(0) },
			ownChainAccountSchema,
		);
	}

	protected getInteroperabilityStore(getStore: StoreCallback): SidechainInteroperabilityStore {
		return new SidechainInteroperabilityStore(this.moduleID, getStore, this.interoperableCCAPIs);
	}
}
