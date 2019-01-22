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
import { registerSecondPassphrase } from './1_register_second_passphrase';
import { registerDelegate } from './2_register_delegate';
import { registerMultisignature } from './4_register_multisignature_account';
import * as constants from './constants';
import { createSignatureObject } from './create_signature_object';
import {
	BaseTransaction,
	DappTransaction,
	InTransferTransaction,
	TransferTransaction,
	VoteTransaction,
} from './transactions';
import * as utils from './utils';

// tslint:disable-next-line no-unbound-method
const transfer = TransferTransaction.create;
// tslint:disable-next-line no-unbound-method
const castVotes = VoteTransaction.create;
// tslint:disable-next-line no-unbound-method
const createDapp = DappTransaction.create;

export {
	BaseTransaction,
	TransferTransaction,
	VoteTransaction,
	InTransferTransaction,
	transfer,
	registerSecondPassphrase,
	registerDelegate,
	castVotes,
	registerMultisignature,
	createSignatureObject,
	createDapp,
	utils,
	constants,
};
