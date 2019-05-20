/*
 * Copyright © 2018 Lisk Foundation
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
import { transfer } from './0_transfer';
import { TransferTransaction } from './0_transfer_transaction';
import { registerSecondPassphrase } from './1_register_second_passphrase';
import { SecondSignatureTransaction } from './1_second_signature_transaction';
import { DelegateTransaction } from './2_delegate_transaction';
import { registerDelegate } from './2_register_delegate';
import { castVotes } from './3_cast_votes';
import { VoteTransaction } from './3_vote_transaction';
import { MultisignatureTransaction } from './4_multisignature_transaction';
import { registerMultisignature } from './4_register_multisignature_account';
import { createDapp } from './5_create_dapp';
import { DappTransaction } from './5_dapp_transaction';
import {
	BaseTransaction,
	StateStore,
	StateStorePrepare,
} from './base_transaction';
import * as constants from './constants';
import { createSignatureObject } from './create_signature_object';
import { convertToAssetError, TransactionError } from './errors';
import { Status, TransactionResponse } from './response';
import { TransactionJSON } from './transaction_types';
import {
	checkPublicKeysForDuplicates,
	convertBeddowsToLSK,
	convertLSKToBeddows,
	getTransactionBytes,
	getTransactionHash,
	getTransactionId,
	isValidInteger,
	multiSignTransaction,
	prepareTransaction,
	prependMinusToPublicKeys,
	prependPlusToPublicKeys,
	signRawTransaction,
	signTransaction,
	stringEndsWith,
	validateAddress,
	validateFee,
	validateKeysgroup,
	validateNonTransferAmount,
	validatePublicKey,
	validatePublicKeys,
	validateTransaction,
	validateTransferAmount,
	validator,
	verifyAmountBalance,
	verifyTransaction,
} from './utils';

const exposedUtils = {
	BigNum,
	convertBeddowsToLSK,
	convertLSKToBeddows,
	isValidInteger,
	multiSignTransaction,
	prependMinusToPublicKeys,
	prependPlusToPublicKeys,
	stringEndsWith,
	validator,
	validateAddress,
	validateKeysgroup,
	validatePublicKey,
	validatePublicKeys,
	verifyAmountBalance,
	validateNonTransferAmount,
	validateTransferAmount,

	// TODO: Deprecated
	signTransaction,
	getTransactionBytes,
	getTransactionId,
	verifyTransaction,
	checkPublicKeysForDuplicates,
	getTransactionHash,
	prepareTransaction,
	signRawTransaction,
	validateFee,
	validateTransaction,
};

export {
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
	registerMultisignature,
	DappTransaction,
	createDapp,
	createSignatureObject,
	Status,
	TransactionResponse,
	TransactionJSON,
	TransactionError,
	convertToAssetError,
	constants,
	exposedUtils as utils,
};
