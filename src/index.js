/**
 * Index module comprising all submodules of lisk-js.
 * @module lisk
 * @main lisk
 */
import 'babel-polyfill';
import naclFactory from 'js-nacl';
import buffer from 'buffer';
import crypto from './transactions/crypto';
import dapp from './transactions/dapp';
import delegate from './transactions/delegate';
import multisignature from './transactions/multisignature';
import signature from './transactions/signature';
import transaction from './transactions/transaction';
import transfer from './transactions/transfer';
import vote from './transactions/vote';
import api from './api/liskApi';
import slots from './time/slots';
import mnemonic from './utils/mnemonic';

global.Buffer = global.Buffer || buffer.Buffer;

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
	signature,
	transaction,
	transfer,
	vote,
	api,
	slots,
	mnemonic,
};

module.exports = lisk;
