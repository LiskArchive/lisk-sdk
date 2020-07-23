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
import * as constants from './constants';
import { convertToAssetError, convertToTransactionError, TransactionError } from './errors';
import { createResponse, Status, TransactionResponse } from './response';
import { transactionInterface } from './schema';
import {
	getSigningBytes,
	validateTransactionSchema,
	signTransaction,
	signMultiSignatureTransaction,
} from './transaction_helper';
import { Account, TransactionJSON } from './types';
import {
	convertBeddowsToLSK,
	convertLSKToBeddows,
	prependMinusToPublicKeys,
	prependPlusToPublicKeys,
	validateSenderIdAndPublicKey,
	validateSignature,
	verifyMinRemainingBalance,
	verifyMultiSignatureTransaction,
} from './utils';

const exposedUtils = {
	convertBeddowsToLSK,
	convertLSKToBeddows,
	prependMinusToPublicKeys,
	prependPlusToPublicKeys,
	validateSignature,
	verifyMinRemainingBalance,
	validateSenderIdAndPublicKey,
	verifyMultiSignatureTransaction,
};

export {
	Account,
	BaseTransaction,
	getSigningBytes,
	StateStore,
	TransferTransaction,
	DelegateTransaction,
	VoteTransaction,
	MultisignatureTransaction,
	UnlockTransaction,
	createResponse,
	ProofOfMisbehaviorTransaction,
	signTransaction,
	signMultiSignatureTransaction,
	Status,
	TransactionResponse,
	TransactionJSON,
	TransactionError,
	validateTransactionSchema,
	transactionInterface,
	convertToAssetError,
	convertToTransactionError,
	constants,
	exposedUtils as utils,
};
