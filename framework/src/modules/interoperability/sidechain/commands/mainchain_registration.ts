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
	EMPTY_HASH,
	MAINCHAIN_ID_BUFFER,
	MAINCHAIN_NAME,
	MODULE_NAME_INTEROPERABILITY,
	TAG_CHAIN_REG_MESSAGE,
	THRESHOLD_MAINCHAIN,
	TOKEN_ID_LSK_MAINCHAIN,
	EMPTY_BYTES,
	CROSS_CHAIN_COMMAND_REGISTRATION,
} from '../../constants';
import {
	ccmSchema,
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
import { SidechainInteroperabilityInternalMethod } from '../store';
import { ChainAccountStore } from '../../stores/chain_account';
import { ChannelDataStore } from '../../stores/channel_data';
import { ChainValidatorsStore } from '../../stores/chain_validators';
import { OutboxRootStore } from '../../stores/outbox_root';
import { OwnChainAccountStore } from '../../stores/own_chain_account';
import { ImmutableStoreGetter, StoreGetter } from '../../../base_store';
import { ChainAccountUpdatedEvent } from '../../events/chain_account_updated';
import { InvalidRegistrationSignatureEvent } from '../../events/invalid_registration_signature';
import { CcmSendSuccessEvent } from '../../events/ccm_send_success';

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

		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(context, EMPTY_BYTES);
		if (!ownChainID.equals(ownChainAccount.chainID)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(`Invalid ownChainID property.`),
			};
		}

		if (!isValidName(ownName)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					`Invalid ownName property. It should contain only characters from the set [a-z0-9!@$&_.].`,
				),
			};
		}

		for (let i = 0; i < mainchainValidators.length; i += 1) {
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
			getMethodContext,
			currentValidators: validators,
			certificateThreshold,
			params: { ownChainID, ownName, mainchainValidators, aggregationBits, signature },
		} = context;
		const methodContext = getMethodContext();

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

		if (
			!bls.verifyWeightedAggSig(
				keyList,
				aggregationBits,
				signature,
				TAG_CHAIN_REG_MESSAGE,
				ownChainID,
				message,
				weights,
				certificateThreshold,
			)
		) {
			// emit persistent event with empty data
			this.events.get(InvalidRegistrationSignatureEvent).log(context, ownChainID);
			throw new Error('Invalid signature property.');
		}

		const chainSubstore = this.stores.get(ChainAccountStore);
		const mainchainAccount = {
			name: MAINCHAIN_NAME,
			lastCertificate: {
				height: 0,
				timestamp: 0,
				stateRoot: EMPTY_HASH,
				validatorsHash: computeValidatorsHash(mainchainValidators, BigInt(THRESHOLD_MAINCHAIN)),
			},
			status: CHAIN_REGISTERED,
		};
		await chainSubstore.set(context, MAINCHAIN_ID_BUFFER, mainchainAccount);

		const channelSubstore = this.stores.get(ChannelDataStore);
		await channelSubstore.set(context, MAINCHAIN_ID_BUFFER, {
			inbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
			outbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
			partnerChainOutboxRoot: EMPTY_HASH,
			messageFeeTokenID: TOKEN_ID_LSK_MAINCHAIN,
		});

		const chainValidatorsSubstore = this.stores.get(ChainValidatorsStore);
		await chainValidatorsSubstore.set(context, MAINCHAIN_ID_BUFFER, {
			activeValidators: mainchainValidators,
			certificateThreshold: BigInt(THRESHOLD_MAINCHAIN),
		});

		const outboxRootSubstore = this.stores.get(OutboxRootStore);
		await outboxRootSubstore.set(context, MAINCHAIN_ID_BUFFER, { root: EMPTY_HASH });

		const ownChainAccountSubstore = this.stores.get(OwnChainAccountStore);
		await ownChainAccountSubstore.set(context, EMPTY_BYTES, {
			name: ownName,
			chainID: ownChainID,
			nonce: BigInt(0),
		});
		this.events
			.get(ChainAccountUpdatedEvent)
			.log(methodContext, MAINCHAIN_ID_BUFFER, mainchainAccount);

		const encodedParams = codec.encode(registrationCCMParamsSchema, {
			chainID: MAINCHAIN_ID_BUFFER,
			name: MAINCHAIN_NAME,
			messageFeeTokenID: TOKEN_ID_LSK_MAINCHAIN,
		});

		const ownChainAccount = await ownChainAccountSubstore.get(context, EMPTY_BYTES);

		const ccm = {
			nonce: ownChainAccount.nonce,
			module: MODULE_NAME_INTEROPERABILITY,
			crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
			sendingChainID: ownChainAccount.chainID,
			receivingChainID: MAINCHAIN_ID_BUFFER,
			fee: BigInt(0),
			status: CCM_STATUS_OK,
			params: encodedParams,
		};
		const interoperabilityInternalMethod = this.getInteroperabilityInternalMethod(context);
		await interoperabilityInternalMethod.addToOutbox(MAINCHAIN_ID_BUFFER, ccm);

		ownChainAccount.nonce += BigInt(1);
		await ownChainAccountSubstore.set(context, EMPTY_BYTES, ownChainAccount);

		const ccmID = utils.hash(codec.encode(ccmSchema, ccm));

		this.events
			.get(CcmSendSuccessEvent)
			.log(methodContext, ownChainAccount.chainID, MAINCHAIN_ID_BUFFER, ccmID, {
				ccmID,
			});
	}

	protected getInteroperabilityInternalMethod(
		context: StoreGetter | ImmutableStoreGetter,
	): SidechainInteroperabilityInternalMethod {
		return new SidechainInteroperabilityInternalMethod(
			this.stores,
			this.events,
			context,
			this.interoperableCCMethods,
		);
	}
}
