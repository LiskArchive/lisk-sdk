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
import * as validAccount from './valid_account.json';
import * as validDappTransactions from './valid_dapp_transactions.json';
import * as validDelegateAccount from './valid_delegate_account.json';
import * as validDelegateTransaction from './valid_delegate_transaction.json';
import * as validInTransferTransactions from './valid_in_transfer_transaction.json';
import * as validMultisignatureAccount from './valid_multisignature_account.json';
import * as validMultisignatureRegistrationTransaction from './valid_multisignature_transaction.json';
import * as validMultisignatureRegistrationTransactionNoSigs from './valid_multisignature_transaction_no_signatures.json';
import * as validOutTransferTransactions from './valid_out_transfer_transactions.json';
import * as validRegisterSecondSignatureTransaction from './valid_register_second_signature_transaction.json';
import * as validSecondSignatureAccount from './valid_second_signature_account.json';
import * as validTransaction from './valid_transaction.json';
import * as validMultisignatureTransaction from './valid_transaction_from_multisignature_account.json';
import * as validSecondSignatureTransaction from './valid_transaction_from_second_signature_account.json';
import * as validTransferAccount from './valid_transfer_account.json';
import * as validTransferTransactions from './valid_transfer_transactions.json';
import * as validVoteTransactions from './valid_vote_transaction.json';

export {
	validAccount,
	validDelegateAccount,
	validDelegateTransaction,
	validTransaction,
	validTransferTransactions,
	validTransferAccount,
	validMultisignatureAccount,
	validMultisignatureRegistrationTransaction,
	validMultisignatureTransaction,
	validMultisignatureRegistrationTransactionNoSigs,
	validRegisterSecondSignatureTransaction,
	validSecondSignatureAccount,
	validSecondSignatureTransaction,
	validVoteTransactions,
	validInTransferTransactions,
	validDappTransactions,
	validOutTransferTransactions,
};
