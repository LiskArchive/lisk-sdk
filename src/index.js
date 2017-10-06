/*
 * Copyright © 2017 Lisk Foundation
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
/**
 * Index module comprising all submodules of lisk-js.
 * @module lisk
 * @main lisk
 */
import 'babel-polyfill';
import Mnemonic from 'bitcore-mnemonic';
import naclFactory from 'js-nacl';
import crypto from './crypto';
import api from './api/liskApi';
import slots from './time/slots';
import send from './transactions/0_send';
import sendFromMultisignatureAccount from './transactions/0_sendFromMultisignatureAccount';
import registerSecondSignature from './transactions/1_registerSecondSignature';
import registerDelegate from './transactions/2_registerDelegate';
import castVotes from './transactions/3_castVotes';
import registerMultisignature from './transactions/4_registerMultisignatureAccount';
import createDapp from './transactions/5_createDapp';
import transferIntoDapp from './transactions/6_transferIntoDapp';
import transferOutOfDapp from './transactions/7_transferOutOfDapp';

global.naclFactory = naclFactory;

global.naclInstance = null;
naclFactory.instantiate((nacl) => {
	naclInstance = nacl;
});

const transaction = Object.assign({},
	send,
	registerSecondSignature,
	registerDelegate,
	castVotes,
	createDapp,
	registerMultisignature,
	transferIntoDapp,
	transferOutOfDapp,
	sendFromMultisignatureAccount,
);

export {
	crypto,
	transaction,
	api,
	slots,
	Mnemonic,
};
