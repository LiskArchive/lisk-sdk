/*
 * Copyright © 2020 Lisk Foundation
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

export const allValidCase = {
	input: {
		maxTransactionsSize: 1000,
		transactions: [
			{
				id: '1',
				senderPublicKey: '8acbb8640572edc4344d6ac75c7ee9fabf33e4869421b1ceb9e129be8da8d5ba',
				fee: 1,
				nonce: 1,
				feePriority: 1,
			},
			{
				id: '2',
				senderPublicKey: '8acbb8640572edc4344d6ac75c7ee9fabf33e4869421b1ceb9e129be8da8d5ba',
				fee: 2,
				nonce: 2,
				feePriority: 2,
			},
			{
				id: '3',
				senderPublicKey: '07b9e755a8f3973bdf4c400326aa37fe61118cd44dfab89d4c3aaec4a223780c',
				fee: 1,
				nonce: 1,
				feePriority: 1,
			},
			{
				id: '4',
				senderPublicKey: '07b9e755a8f3973bdf4c400326aa37fe61118cd44dfab89d4c3aaec4a223780c',
				fee: 2,
				nonce: 2,
				feePriority: 2,
			},
			{
				id: '5',
				senderPublicKey: '51454420a60031324faef12b9aee46b619a0ac6c93479a1985957337174ce1d0',
				fee: 3,
				nonce: 1,
				feePriority: 3,
			},
		],
	},
	output: [
		{
			id: '5',
			senderPublicKey: '51454420a60031324faef12b9aee46b619a0ac6c93479a1985957337174ce1d0',
			fee: 3,
			nonce: 1,
			feePriority: 3,
		},
		{
			id: '3',
			senderPublicKey: '07b9e755a8f3973bdf4c400326aa37fe61118cd44dfab89d4c3aaec4a223780c',
			fee: 1,
			nonce: 1,
			feePriority: 1,
		},
		{
			id: '4',
			senderPublicKey: '07b9e755a8f3973bdf4c400326aa37fe61118cd44dfab89d4c3aaec4a223780c',
			fee: 2,
			nonce: 2,
			feePriority: 2,
		},
		{
			id: '1',
			senderPublicKey: '8acbb8640572edc4344d6ac75c7ee9fabf33e4869421b1ceb9e129be8da8d5ba',
			fee: 1,
			nonce: 1,
			feePriority: 1,
		},
		{
			id: '2',
			senderPublicKey: '8acbb8640572edc4344d6ac75c7ee9fabf33e4869421b1ceb9e129be8da8d5ba',
			fee: 2,
			nonce: 2,
			feePriority: 2,
		},
	],
};

export const maxTransactionsSizeCase = {
	input: {
		maxTransactionsSize: 1000,
		transactions: [
			{
				id: '1',
				senderPublicKey: '8acbb8640572edc4344d6ac75c7ee9fabf33e4869421b1ceb9e129be8da8d5ba',
				fee: 1,
				nonce: 1,
				bytes: 300,
				feePriority: 1,
			},
			{
				id: '2',
				senderPublicKey: '8acbb8640572edc4344d6ac75c7ee9fabf33e4869421b1ceb9e129be8da8d5ba',
				fee: 2,
				nonce: 2,
				bytes: 200,
				feePriority: 2,
			},
			{
				id: '3',
				senderPublicKey: '07b9e755a8f3973bdf4c400326aa37fe61118cd44dfab89d4c3aaec4a223780c',
				fee: 1,
				nonce: 1,
				bytes: 200,
				feePriority: 1,
			},
			{
				id: '4',
				senderPublicKey: '07b9e755a8f3973bdf4c400326aa37fe61118cd44dfab89d4c3aaec4a223780c',
				fee: 2,
				nonce: 2,
				bytes: 100,
				feePriority: 2,
			},
			{
				id: '5',
				senderPublicKey: '51454420a60031324faef12b9aee46b619a0ac6c93479a1985957337174ce1d0',
				fee: 3,
				nonce: 1,
				bytes: 300,
				feePriority: 3,
			},
		],
	},
	output: [
		{
			id: '5',
			senderPublicKey: '51454420a60031324faef12b9aee46b619a0ac6c93479a1985957337174ce1d0',
			fee: 3,
			nonce: 1,
			bytes: 300,
			feePriority: 3,
		},
		{
			id: '3',
			senderPublicKey: '07b9e755a8f3973bdf4c400326aa37fe61118cd44dfab89d4c3aaec4a223780c',
			fee: 1,
			nonce: 1,
			bytes: 200,
			feePriority: 1,
		},
		{
			id: '4',
			senderPublicKey: '07b9e755a8f3973bdf4c400326aa37fe61118cd44dfab89d4c3aaec4a223780c',
			fee: 2,
			nonce: 2,
			bytes: 100,
			feePriority: 2,
		},
		{
			id: '1',
			senderPublicKey: '8acbb8640572edc4344d6ac75c7ee9fabf33e4869421b1ceb9e129be8da8d5ba',
			fee: 1,
			nonce: 1,
			bytes: 300,
			feePriority: 1,
		},
	],
};

export const invalidTxCase = {
	input: {
		maxTransactionsSize: 1000,
		transactions: [
			{
				id: '1',
				senderPublicKey: '8acbb8640572edc4344d6ac75c7ee9fabf33e4869421b1ceb9e129be8da8d5ba',
				fee: 1,
				nonce: 1,
				feePriority: 1,
			},
			{
				id: '2',
				senderPublicKey: '8acbb8640572edc4344d6ac75c7ee9fabf33e4869421b1ceb9e129be8da8d5ba',
				fee: 2,
				nonce: 2,
				valid: false,
				feePriority: 2,
			},
			{
				id: '3',
				senderPublicKey: '8acbb8640572edc4344d6ac75c7ee9fabf33e4869421b1ceb9e129be8da8d5ba',
				fee: 1,
				nonce: 3,
				feePriority: 1,
			},
			{
				id: '4',
				senderPublicKey: '07b9e755a8f3973bdf4c400326aa37fe61118cd44dfab89d4c3aaec4a223780c',
				fee: 2,
				nonce: 2,
				feePriority: 2,
			},
			{
				id: '5',
				senderPublicKey: '51454420a60031324faef12b9aee46b619a0ac6c93479a1985957337174ce1d0',
				fee: 3,
				nonce: 1,
				feePriority: 3,
			},
		],
	},
	output: [
		{
			id: '5',
			senderPublicKey: '51454420a60031324faef12b9aee46b619a0ac6c93479a1985957337174ce1d0',
			fee: 3,
			nonce: 1,
			feePriority: 3,
		},
		{
			id: '4',
			senderPublicKey: '07b9e755a8f3973bdf4c400326aa37fe61118cd44dfab89d4c3aaec4a223780c',
			fee: 2,
			nonce: 2,
			feePriority: 2,
		},
		{
			id: '1',
			senderPublicKey: '8acbb8640572edc4344d6ac75c7ee9fabf33e4869421b1ceb9e129be8da8d5ba',
			fee: 1,
			nonce: 1,
			feePriority: 1,
		},
	],
};

export const allInvalidCase = {
	input: {
		maxTransactionsSize: 1000,
		transactions: [
			{
				id: '1',
				senderPublicKey: '8acbb8640572edc4344d6ac75c7ee9fabf33e4869421b1ceb9e129be8da8d5ba',
				fee: 1,
				nonce: 1,
				valid: false,
				feePriority: 1,
			},
			{
				id: '2',
				senderPublicKey: '8acbb8640572edc4344d6ac75c7ee9fabf33e4869421b1ceb9e129be8da8d5ba',
				fee: 2,
				nonce: 2,
				valid: false,
				feePriority: 2,
			},
			{
				id: '3',
				senderPublicKey: '8acbb8640572edc4344d6ac75c7ee9fabf33e4869421b1ceb9e129be8da8d5ba',
				fee: 1,
				nonce: 3,
				valid: false,
				feePriority: 1,
			},
			{
				id: '4',
				senderPublicKey: '07b9e755a8f3973bdf4c400326aa37fe61118cd44dfab89d4c3aaec4a223780c',
				fee: 2,
				nonce: 2,
				valid: false,
				feePriority: 2,
			},
			{
				id: '5',
				senderPublicKey: '51454420a60031324faef12b9aee46b619a0ac6c93479a1985957337174ce1d0',
				fee: 3,
				nonce: 1,
				valid: false,
				feePriority: 3,
			},
		],
	},
	output: [],
};
