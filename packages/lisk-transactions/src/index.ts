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
import { InTransferTransaction } from './6_in_transfer_transaction';
import { OutTransferTransaction } from './7_out_transfer_transaction';
import { BaseTransaction } from './base_transaction';
import * as constants from './constants';
import { createSignatureObject } from './create_signature_object';
import { TransactionError, TransactionMultiError } from './errors';
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
	validateAddress,
	validateFee,
	validateKeysgroup,
	validatePublicKey,
	validatePublicKeys,
	validateTransaction,
	verifyTransaction,
} from './utils';

const exposedUtils = {
	convertBeddowsToLSK,
	convertLSKToBeddows,
	isValidInteger,
	multiSignTransaction,
	prependMinusToPublicKeys,
	prependPlusToPublicKeys,
	validateAddress,
	validateKeysgroup,
	validatePublicKey,
	validatePublicKeys,

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
	InTransferTransaction,
	OutTransferTransaction,
	createSignatureObject,
	Status,
	TransactionResponse,
	TransactionJSON,
	TransactionError,
	TransactionMultiError,
	constants,
	exposedUtils as utils,
};
