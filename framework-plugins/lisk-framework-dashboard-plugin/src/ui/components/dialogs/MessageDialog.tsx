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
import { Dialog, DialogBody, DialogHeader, DialogProps, DialogContext } from '../dialog';
import Button from '../Button';
import Text from '../Text';

interface MessageDialogProps extends DialogProps {
	title: string;
	backBtn?: boolean;
}

interface MessageDialogBodyProps {
	backBtn?: boolean;
}

const MessageDialogBody: React.FC<MessageDialogBodyProps> = props => {
	const dialogContext = React.useContext(DialogContext);

	return (
		<DialogBody>
			{props.children}
			{props.backBtn && (
				<React.Fragment>
					<br />
					<Button onClick={dialogContext.closeDialog}>Back to Dashboard</Button>
				</React.Fragment>
			)}
		</DialogBody>
	);
};

const MessageDialog: React.FC<MessageDialogProps> = props => {
	const { title, backBtn, ...rest } = props;

	return (
		<Dialog {...rest}>
			<DialogHeader>
				<Text type={'h1'}>{title}</Text>
			</DialogHeader>
			<MessageDialogBody backBtn={backBtn}>{props.children}</MessageDialogBody>
		</Dialog>
	);
};

export default MessageDialog;
