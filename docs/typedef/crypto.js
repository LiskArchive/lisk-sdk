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
 */
/**
 * Public Key obtained from sodium.crypto_sign_seed_keypair(hash)
 * @typedef {string} publicKey
 */
/**
 * Private Key obtained from sodium.crypto_sign_seed_keypair(hash)
 * @typedef {string} privateKey
 */
/**
 * Address obtained from publicKey using bignum function + 'L'.
 * @typedef {string} address
 */
/**
 * publicKey, privateKey
 * @typedef {Object} keypair
 */
