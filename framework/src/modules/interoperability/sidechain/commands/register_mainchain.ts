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
import { bls } from '@liskhq/lisk-cryptography';
import {
	EMPTY_HASH,
	EMPTY_BYTES,
	MESSAGE_TAG_CHAIN_REG,
	CHAIN_NAME_MAINCHAIN,
} from '../../constants';
import { mainchainRegParams, registrationSignatureMessageSchema } from '../../schemas';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../../state_machine';
import { MainchainRegistrationParams, ActiveValidators, ValidatorsMethod } from '../../types';
import {
	getEncodedCCMAndID,
	getMainchainID,
	getTokenIDLSK,
	sortValidatorsByBLSKey,
	isValidName,
} from '../../utils';
import { ChainAccountStore } from '../../stores/chain_account';
import { OwnChainAccountStore } from '../../stores/own_chain_account';
import { ChainAccountUpdatedEvent } from '../../events/chain_account_updated';
import { InvalidRegistrationSignatureEvent } from '../../events/invalid_registration_signature';
import { CcmSendSuccessEvent } from '../../events/ccm_send_success';
import { SidechainInteroperabilityInternalMethod } from '../internal_method';
import { InvalidNameError } from '../../errors';
import { BaseRegisterChainCommand } from '../../base_interoperability_register_chain_command';

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0043.md#mainchain-registration-command-1
export class RegisterMainchainCommand extends BaseRegisterChainCommand<SidechainInteroperabilityInternalMethod> {
	public schema = mainchainRegParams;

	private _validatorsMethod!: ValidatorsMethod;

	public addDependencies(validatorsMethod: ValidatorsMethod) {
		this._validatorsMethod = validatorsMethod;
	}

	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0043.md#verification-1
	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<MainchainRegistrationParams>,
	): Promise<VerificationResult> {
		const { ownName, mainchainValidators, mainchainCertificateThreshold, ownChainID } =
			context.params;

		// The mainchain account must not exist already.
		const mainchainID = getMainchainID(context.chainID);
		const chainAccountSubstore = this.stores.get(ChainAccountStore);
		const mainchainAccountExists = await chainAccountSubstore.has(context, mainchainID);
		if (mainchainAccountExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Mainchain has already been registered.'),
			};
		}

		// The ownChainID property has to match with the chain identifier.
		if (!ownChainID.equals(context.chainID)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(`Invalid ownChainID property.`),
			};
		}

		// The ownName property has to contain only characters from the set [a-z0-9!@$&_.].
		if (!isValidName(ownName)) {
			return {
				status: VerifyStatus.FAIL,
				error: new InvalidNameError('ownName'),
			};
		}

		const verificationResult = this.verifyValidators(
			mainchainValidators,
			mainchainCertificateThreshold,
		);
		if (verificationResult.status === VerifyStatus.FAIL) {
			return verificationResult;
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<MainchainRegistrationParams>): Promise<void> {
		const {
			getMethodContext,
			params: {
				ownChainID,
				ownName,
				mainchainValidators,
				mainchainCertificateThreshold,
				aggregationBits,
				signature,
			},
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
			ownName,
			ownChainID,
			mainchainValidators,
			mainchainCertificateThreshold,
		});

		if (
			!bls.verifyWeightedAggSig(
				keyList,
				aggregationBits,
				signature,
				MESSAGE_TAG_CHAIN_REG,
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
		const mainchainTokenID = getTokenIDLSK(context.chainID);
		const mainchainAccount = this.buildChainAccount(
			CHAIN_NAME_MAINCHAIN,
			mainchainValidators,
			mainchainCertificateThreshold,
		);

		await this.saveChainAccount(context, mainchainID, mainchainAccount);
		await this.saveChannelData(context, mainchainID, this.buildChannelData(mainchainTokenID));
		await this.saveChainValidators(
			context,
			mainchainID,
			mainchainValidators,
			mainchainCertificateThreshold,
		);
		await this.saveOutboxRoot(context, mainchainID, EMPTY_HASH);

		this.events.get(ChainAccountUpdatedEvent).log(methodContext, mainchainID, mainchainAccount);

		const encodedParams = this.buildEncodedParams(
			CHAIN_NAME_MAINCHAIN,
			mainchainID,
			mainchainTokenID,
		);
		const ownChainAccount = {
			name: ownName,
			chainID: ownChainID,
			nonce: BigInt(0),
		};

		const ccm = this.buildCCM(ownChainAccount, mainchainID, encodedParams);
		await this.internalMethod.addToOutbox(context, mainchainID, ccm);

		ownChainAccount.nonce += BigInt(1);
		await this.stores.get(OwnChainAccountStore).set(context, EMPTY_BYTES, ownChainAccount);

		const { ccmID } = getEncodedCCMAndID(ccm);
		this.events
			.get(CcmSendSuccessEvent)
			.log(methodContext, ownChainAccount.chainID, mainchainID, ccmID, {
				ccm,
			});
	}
}
