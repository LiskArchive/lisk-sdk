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
	EMPTY_HASH,
	MAINCHAIN_NAME,
	MODULE_NAME_INTEROPERABILITY,
	TAG_CHAIN_REG_MESSAGE,
	THRESHOLD_MAINCHAIN,
	EMPTY_BYTES,
	CROSS_CHAIN_COMMAND_REGISTRATION,
	CCMStatusCode,
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
import { MainchainRegistrationParams, ActiveValidators, ValidatorsMethod } from '../../types';
import {
	computeValidatorsHash,
	getMainchainID,
	getMainchainTokenID,
	isValidName,
	sortValidatorsByBLSKey,
} from '../../utils';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import { ChainAccountStore, ChainStatus } from '../../stores/chain_account';
import { ChannelDataStore } from '../../stores/channel_data';
import { ChainValidatorsStore } from '../../stores/chain_validators';
import { OutboxRootStore } from '../../stores/outbox_root';
import { OwnChainAccountStore } from '../../stores/own_chain_account';
import { ChainAccountUpdatedEvent } from '../../events/chain_account_updated';
import { InvalidRegistrationSignatureEvent } from '../../events/invalid_registration_signature';
import { CcmSendSuccessEvent } from '../../events/ccm_send_success';
import { SidechainInteroperabilityInternalMethod } from '../internal_method';

export class MainchainRegistrationCommand extends BaseInteroperabilityCommand<SidechainInteroperabilityInternalMethod> {
	public schema = mainchainRegParams;

	private _validatorsMethod!: ValidatorsMethod;

	public addDependencies(validatorsMethod: ValidatorsMethod) {
		this._validatorsMethod = validatorsMethod;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<MainchainRegistrationParams>,
	): Promise<VerificationResult> {
		const { ownName, mainchainValidators, ownChainID } = context.params;

		try {
			validator.validate<MainchainRegistrationParams>(mainchainRegParams, context.params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
			};
		}

		if (!ownChainID.equals(context.chainID)) {
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
					error: new Error('Validators blsKeys must be unique and lexicographically ordered.'),
				};
			}

			if (currentValidator.bftWeight <= 0) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Validator bft weight must be positive integer.'),
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
			params: { ownChainID, ownName, mainchainValidators, aggregationBits, signature },
		} = context;
		const methodContext = getMethodContext();

		const { validators, certificateThreshold } = await this._validatorsMethod.getValidatorsParams(
			getMethodContext(),
		);

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
			this.events.get(InvalidRegistrationSignatureEvent).error(context, ownChainID);
			throw new Error('Invalid signature property.');
		}

		const mainchainID = getMainchainID(context.chainID);
		const mainchainTokenID = getMainchainTokenID(context.chainID);
		const chainSubstore = this.stores.get(ChainAccountStore);
		const mainchainAccount = {
			name: MAINCHAIN_NAME,
			lastCertificate: {
				height: 0,
				timestamp: 0,
				stateRoot: EMPTY_HASH,
				validatorsHash: computeValidatorsHash(mainchainValidators, BigInt(THRESHOLD_MAINCHAIN)),
			},
			status: ChainStatus.REGISTERED,
		};
		await chainSubstore.set(context, mainchainID, mainchainAccount);

		const channelSubstore = this.stores.get(ChannelDataStore);
		await channelSubstore.set(context, mainchainID, {
			inbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
			outbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
			partnerChainOutboxRoot: EMPTY_HASH,
			messageFeeTokenID: mainchainTokenID,
		});

		const chainValidatorsSubstore = this.stores.get(ChainValidatorsStore);
		await chainValidatorsSubstore.set(context, mainchainID, {
			activeValidators: mainchainValidators,
			certificateThreshold: BigInt(THRESHOLD_MAINCHAIN),
		});

		const outboxRootSubstore = this.stores.get(OutboxRootStore);
		await outboxRootSubstore.set(context, mainchainID, { root: EMPTY_HASH });

		this.events.get(ChainAccountUpdatedEvent).log(methodContext, mainchainID, mainchainAccount);

		const encodedParams = codec.encode(registrationCCMParamsSchema, {
			name: MAINCHAIN_NAME,
			messageFeeTokenID: mainchainTokenID,
		});

		const ownChainAccount = {
			name: ownName,
			chainID: ownChainID,
			nonce: BigInt(0),
		};

		const ccm = {
			nonce: ownChainAccount.nonce,
			module: MODULE_NAME_INTEROPERABILITY,
			crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
			sendingChainID: ownChainAccount.chainID,
			receivingChainID: mainchainID,
			fee: BigInt(0),
			status: CCMStatusCode.OK,
			params: encodedParams,
		};
		await this.internalMethod.addToOutbox(context, mainchainID, ccm);

		ownChainAccount.nonce += BigInt(1);
		await this.stores.get(OwnChainAccountStore).set(context, EMPTY_BYTES, ownChainAccount);

		const ccmID = utils.hash(codec.encode(ccmSchema, ccm));

		this.events
			.get(CcmSendSuccessEvent)
			.log(methodContext, ownChainAccount.chainID, mainchainID, ccmID, {
				ccmID,
			});
	}
}
