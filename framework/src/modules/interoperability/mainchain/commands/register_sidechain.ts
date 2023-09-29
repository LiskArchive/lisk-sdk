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

import { MainchainInteroperabilityInternalMethod } from '../internal_method';
import { EMPTY_BYTES, CHAIN_REGISTRATION_FEE } from '../../constants';
import { sidechainRegParams } from '../../schemas';
import { FeeMethod, SidechainRegistrationParams } from '../../types';
import { getEncodedCCMAndID, getTokenIDLSK, isValidName } from '../../utils';
import {
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
	CommandExecuteContext,
} from '../../../../state_machine';
import { ChainAccountStore } from '../../stores/chain_account';
import { RegisteredNamesStore } from '../../stores/registered_names';
import { ChainAccountUpdatedEvent } from '../../events/chain_account_updated';
import { OwnChainAccountStore } from '../../stores/own_chain_account';
import { CcmSendSuccessEvent } from '../../events/ccm_send_success';
import { TokenMethod } from '../../../token';
import { InvalidNameError } from '../../errors';
import { BaseRegisterChainCommand } from '../../base_interoperability_register_chain_command';

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0043.md#sidechain-registration-command-1
export class RegisterSidechainCommand extends BaseRegisterChainCommand<MainchainInteroperabilityInternalMethod> {
	public schema = sidechainRegParams;
	private _feeMethod!: FeeMethod;
	private _tokenMethod!: TokenMethod;

	public addDependencies(feeMethod: FeeMethod, tokenMethod: TokenMethod) {
		this._feeMethod = feeMethod;
		this._tokenMethod = tokenMethod;
	}

	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0043.md#verification
	public async verify(
		context: CommandVerifyContext<SidechainRegistrationParams>,
	): Promise<VerificationResult> {
		const {
			transaction,
			params: { sidechainValidators, sidechainCertificateThreshold, chainID, name },
		} = context;

		// 	The name property has to contain only characters from the set [a-z0-9!@$&_.].
		if (!isValidName(name)) {
			return {
				status: VerifyStatus.FAIL,
				error: new InvalidNameError('name'),
			};
		}

		// 	The name property has to be unique with respect to the set of already registered sidechain names.
		const nameSubstore = this.stores.get(RegisteredNamesStore);
		const nameExists = await nameSubstore.has(context, Buffer.from(name, 'ascii'));
		if (nameExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Name already registered.'),
			};
		}

		// Chain ID has to be unique with respect to the set of already registered sidechains.
		const chainAccountSubstore = this.stores.get(ChainAccountStore);
		const chainAccountExists = await chainAccountSubstore.has(context, chainID);
		if (chainAccountExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Chain ID already registered.'),
			};
		}

		// Check that the first byte of the chainID, indicating the network, matches.
		if (chainID[0] !== context.chainID[0]) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Chain ID does not match the mainchain network.'),
			};
		}

		// Chain ID cannot be the mainchain chain ID.
		if (chainID.equals(context.chainID)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Chain ID cannot be the mainchain chain ID.'),
			};
		}

		const verificationResult = this.verifyValidators(
			sidechainValidators,
			sidechainCertificateThreshold,
		);
		if (verificationResult.status === VerifyStatus.FAIL) {
			return verificationResult;
		}

		// Transaction fee has to be greater or equal than the registration fee
		if (transaction.fee < CHAIN_REGISTRATION_FEE) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					`Transaction fee has to be greater or equal than the registration fee ${CHAIN_REGISTRATION_FEE}.`,
				),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0043.md#execution
	public async execute(context: CommandExecuteContext<SidechainRegistrationParams>): Promise<void> {
		const {
			getMethodContext,
			params: { sidechainCertificateThreshold, sidechainValidators, chainID, name },
		} = context;
		const methodContext = getMethodContext();

		// Create chain account
		// Add an entry in the chain substore
		const sidechainAccount = this.buildChainAccount(
			name,
			sidechainValidators,
			sidechainCertificateThreshold,
		);
		await this.saveChainAccount(context, chainID, sidechainAccount);

		// Add an entry in the channel substore
		const mainchainTokenID = getTokenIDLSK(context.chainID);
		const sidechainChannel = this.buildChannelData(mainchainTokenID);
		await this.saveChannelData(context, chainID, sidechainChannel);

		// Add an entry in the validators substore
		await this.saveChainValidators(
			context,
			chainID,
			sidechainValidators,
			sidechainCertificateThreshold,
		);

		// Add an entry in the outbox root substore
		await this.saveOutboxRoot(context, chainID, sidechainChannel.outbox.root);

		// Add an entry in the registered names substore
		const registeredNamesSubstore = this.stores.get(RegisteredNamesStore);
		await registeredNamesSubstore.set(context, Buffer.from(name, 'ascii'), { chainID });

		// Pay the registration fee
		this._feeMethod.payFee(context.getMethodContext(), CHAIN_REGISTRATION_FEE);

		// Initialize escrow account for token used for message fees
		await this._tokenMethod.initializeEscrowAccount(
			context.getMethodContext(),
			chainID,
			sidechainChannel.messageFeeTokenID,
		);

		// Emit chain account updated event.
		this.events.get(ChainAccountUpdatedEvent).log(methodContext, chainID, sidechainAccount);

		// Send registration CCM to the sidechain.
		// We do not call sendInternal because it would fail as the receiving chain is not active yet

		const encodedParams = this.buildEncodedParams(
			name,
			chainID,
			sidechainChannel.messageFeeTokenID,
		);
		const ownChainAccountSubstore = this.stores.get(OwnChainAccountStore);
		const ownChainAccount = await ownChainAccountSubstore.get(methodContext, EMPTY_BYTES);

		const ccm = this.buildCCM(ownChainAccount, chainID, encodedParams);
		await this.internalMethod.addToOutbox(context, chainID, ccm);

		// Update own chain account nonce
		ownChainAccount.nonce += BigInt(1);
		await ownChainAccountSubstore.set(context, EMPTY_BYTES, ownChainAccount);

		// Emit CCM Sent Event
		const { ccmID } = getEncodedCCMAndID(ccm);
		this.events
			.get(CcmSendSuccessEvent)
			.log(methodContext, ownChainAccount.chainID, chainID, ccmID, {
				ccm,
			});
	}
}
