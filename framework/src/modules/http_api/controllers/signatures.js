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
 */

'use strict';

const ApiError = require('../api_error');
const apiCodes = require('../api_codes');

let channel;

function SignaturesController(scope) {
	({ channel } = scope);
}

SignaturesController.postSignature = async (context, next) => {
	const signature = context.request.swagger.params.signature.value;
	let error;

	try {
		const data = await channel.invoke('chain:postSignature', { signature });

		if (!data.errors) {
			return next(null, {
				data: { message: 'Signature Accepted' },
				meta: { status: true },
			});
		}

		if (data.code === apiCodes.PROCESSING_ERROR) {
			error = new ApiError(
				'Error processing signature',
				apiCodes.PROCESSING_ERROR,
				data.errors,
			);
		} else if (data.code === apiCodes.BAD_REQUEST) {
			error = new ApiError(
				'Invalid signature body',
				apiCodes.BAD_REQUEST,
				data.errors,
			);
		} else {
			error = new ApiError(
				'Internal server error',
				apiCodes.INTERNAL_SERVER_ERROR,
				[],
			);
		}
	} catch (err) {
		error = new ApiError(
			'Internal server error',
			apiCodes.INTERNAL_SERVER_ERROR,
		);
	}

	context.statusCode = error.code;
	return next(error);
};

module.exports = SignaturesController;
