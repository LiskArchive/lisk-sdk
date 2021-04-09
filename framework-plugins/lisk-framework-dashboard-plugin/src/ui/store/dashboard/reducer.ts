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
/* eslint-disable no-param-reassign */
import { createReducer } from '@reduxjs/toolkit';
import { clearDialogState } from './action';

export interface DashboardState {
	successMessage?: string;
	errorMessage?: string;
}

const initialState: DashboardState = {};

export const dashboardReducer = createReducer(initialState, builder => {
	builder.addCase(clearDialogState, state => {
		state.errorMessage = undefined;
		state.successMessage = undefined;
	});
});
