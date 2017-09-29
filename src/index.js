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
import dapp from './transactions/dapp';
import delegate from './transactions/delegate';
import multisignature from './transactions/multisignature';
import multisignatureTransaction from './transactions/multisignatureTransaction';
import signature from './transactions/signature';
import transaction from './transactions/transaction';
import inTransfer from './transactions/inTransfer';
import outTransfer from './transactions/outTransfer';
import vote from './transactions/vote';
import api from './api/liskApi';
import slots from './time/slots';

global.naclFactory = naclFactory;

global.naclInstance = null;
naclFactory.instantiate((nacl) => {
	naclInstance = nacl;
});

const lisk = {
	crypto,
	dapp,
	delegate,
	multisignature,
	multisignatureTransaction,
	signature,
	transaction,
	inTransfer,
	outTransfer,
	vote,
	api,
	slots,
	Mnemonic,
};

module.exports = lisk;
