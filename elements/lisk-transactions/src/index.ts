/*
 * Copyright © 2019 Lisk Foundation
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
 *
 */

import { DelegateTransaction } from './10_delegate_transaction';
import { MultisignatureTransaction } from './12_multisignature_transaction';
import { VoteTransaction } from './13_vote_transaction';
import { UnlockTransaction } from './14_unlock_transaction';
import { ProofOfMisbehaviorTransaction } from './15_proof_of_misbehavior_transaction';
import { TransferTransaction } from './8_transfer_transaction';
import { BaseTransaction, StateStore } from './base_transaction';
import { castVotes } from './cast_votes';
import * as constants from './constants';
import {
	convertToAssetError,
	convertToTransactionError,
	TransactionError,
} from './errors';
import { registerDelegate } from './register_delegate';
import { registerMultisignature } from './register_multisignature_account';
import { reportMisbehavior } from './report_misbehavior';
import { createResponse, Status, TransactionResponse } from './response';
import { transactionInterface } from './schema';
import { signMultiSignatureTransaction } from './sign_multi_signature_transaction';
import { Account, TransactionJSON } from './transaction_types';
import { transfer } from './transfer';
import { unlockToken } from './unlock_token';
import {
	convertBeddowsToLSK,
	convertLSKToBeddows,
	getId,
	prependMinusToPublicKeys,
	prependPlusToPublicKeys,
	validateMultisignatures,
	validateSenderIdAndPublicKey,
	validateSignature,
	verifyMinRemainingBalance,
	verifyMultiSignatureTransaction,
	verifySenderPublicKey,
} from './utils';

const exposedUtils = {
	convertBeddowsToLSK,
	getId,
	convertLSKToBeddows,
	prependMinusToPublicKeys,
	prependPlusToPublicKeys,
	validateMultisignatures,
	validateSignature,
	verifyMinRemainingBalance,
	validateSenderIdAndPublicKey,
	verifyMultiSignatureTransaction,
	verifySenderPublicKey,
};

export {
	Account,
	BaseTransaction,
	StateStore,
	TransferTransaction,
	transfer,
	DelegateTransaction,
	registerDelegate,
	VoteTransaction,
	castVotes,
	MultisignatureTransaction,
	UnlockTransaction,
	unlockToken,
	reportMisbehavior,
	createResponse,
	ProofOfMisbehaviorTransaction,
	registerMultisignature,
	signMultiSignatureTransaction,
	Status,
	TransactionResponse,
	TransactionJSON,
	TransactionError,
	transactionInterface,
	convertToAssetError,
	convertToTransactionError,
	constants,
	exposedUtils as utils,
};
