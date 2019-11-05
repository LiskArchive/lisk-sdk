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
import * as BigNum from '@liskhq/bignum';
import { DelegateTransaction } from './10_delegate_transaction';
import { VoteTransaction } from './11_vote_transaction';
import { MultisignatureTransaction } from './12_multisignature_transaction';
import { TransferTransaction } from './8_transfer_transaction';
import { SecondSignatureTransaction } from './9_second_signature_transaction';
import {
	BaseTransaction,
	StateStore,
	StateStorePrepare,
} from './base_transaction';
import { castVotes } from './cast_votes';
import * as constants from './constants';
import {
	createSignatureObject,
	SignatureObject,
} from './create_signature_object';
import {
	convertToAssetError,
	convertToTransactionError,
	TransactionError,
	TransactionPendingError,
} from './errors';
import { registerDelegate } from './register_delegate';
import { registerMultisignature } from './register_multisignature_account';
import { registerSecondPassphrase } from './register_second_passphrase';
import { createResponse, Status, TransactionResponse } from './response';
import { Account, TransactionJSON } from './transaction_types';
import { transfer } from './transfer';
import {
	convertBeddowsToLSK,
	convertLSKToBeddows,
	getId,
	isValidInteger,
	isValidNumber,
	prependMinusToPublicKeys,
	prependPlusToPublicKeys,
	stringEndsWith,
	transactionInterface,
	validateAddress,
	validateKeysgroup,
	validateMultisignatures,
	validateNonTransferAmount,
	validatePublicKey,
	validatePublicKeys,
	validateSenderIdAndPublicKey,
	validateSignature,
	validateTransferAmount,
	validator,
	verifyAmountBalance,
	verifyBalance,
	verifyMultiSignatures,
	verifySecondSignature,
	verifySenderPublicKey,
} from './utils';

const exposedUtils = {
	BigNum,
	convertBeddowsToLSK,
	getId,
	convertLSKToBeddows,
	isValidInteger,
	isValidNumber,
	prependMinusToPublicKeys,
	prependPlusToPublicKeys,
	stringEndsWith,
	validator,
	validateAddress,
	validateKeysgroup,
	validatePublicKey,
	validatePublicKeys,
	validateMultisignatures,
	validateSignature,
	verifyAmountBalance,
	validateNonTransferAmount,
	validateTransferAmount,
	validateSenderIdAndPublicKey,
	verifyBalance,
	verifyMultiSignatures,
	verifySecondSignature,
	verifySenderPublicKey,
};

export {
	Account,
	BaseTransaction,
	StateStore,
	StateStorePrepare,
	TransferTransaction,
	transfer,
	SecondSignatureTransaction,
	registerSecondPassphrase,
	DelegateTransaction,
	registerDelegate,
	VoteTransaction,
	castVotes,
	MultisignatureTransaction,
	createResponse,
	registerMultisignature,
	createSignatureObject,
	SignatureObject,
	Status,
	TransactionResponse,
	TransactionJSON,
	TransactionError,
	TransactionPendingError,
	transactionInterface,
	convertToAssetError,
	convertToTransactionError,
	constants,
	exposedUtils as utils,
};
