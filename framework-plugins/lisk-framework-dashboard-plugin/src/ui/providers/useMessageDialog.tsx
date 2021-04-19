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

import * as React from 'react';
import { MessageDialogProviderContext } from './MessageDialogProvider';

interface UseMessageDialogProvider {
	showMessageDialog: (
		message: string,
		body: React.ReactNode,
		options?: { backButton: boolean },
	) => void;
	closeMessageDialog: () => void;
}

const useMessageDialog = (): UseMessageDialogProvider => {
	const { dispatch } = React.useContext(MessageDialogProviderContext);

	const showMessageDialog = (
		title: string,
		body: React.ReactNode,
		options?: { backButton: boolean },
	) => {
		dispatch({ open: true, title, body, backBtn: options?.backButton ?? false });
	};

	const closeMessageDialog = () => {
		dispatch({ open: false, title: '', body: <React.Fragment />, backBtn: false });
	};

	return { showMessageDialog, closeMessageDialog };
};

export default useMessageDialog;
