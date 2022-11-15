/*
 * Copyright © 2021 Lisk Foundation
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

export const COMMAND_NAME_REGISTER_MULTISIGNATURE_GROUP = 'registerMultisignature';
export const MAX_NUMBER_OF_SIGNATURES = 64;

// Events
export const MESSAGE_TAG_MULTISIG_REG = 'LSK_RMSG_';
export const MESSAGE_TAG_TRANSACTION = Buffer.from('LSK_TX_', 'utf8');
// Constants
export const ADDRESS_LENGTH = 20;
export const ED25519_PUBLIC_KEY_LENGTH = 32;
export const ED25519_SIGNATURE_LENGTH = 64;
