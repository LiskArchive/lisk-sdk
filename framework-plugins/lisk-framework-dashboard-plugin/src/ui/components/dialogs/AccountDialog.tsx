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
import { Dialog, DialogBody, DialogHeader, DialogProps } from '../dialog';
import Text from '../Text';
import { Account } from '../../types';
import Grid from '../Grid';
import CopiableText from '../CopiableText';
import Box from '../Box';

interface AccountDialogProps extends DialogProps {
	account: Account;
}

const AccountDialog: React.FC<AccountDialogProps> = props => {
	const { account, ...rest } = props;

	return (
		<Dialog {...rest}>
			<DialogHeader>
				<Text type={'h1'}>Account details</Text>
			</DialogHeader>
			<DialogBody>
				{account && (
					<Grid container fluid spacing={3}>
						<Grid row rowBorder>
							<Grid md={6} xs={12}>
								<Box mb={2} mr={1}>
									<Text type={'h3'}>Lisk32 address</Text>
								</Box>
								<CopiableText text={account.address}>{account.address}</CopiableText>
							</Grid>
							<Grid md={6} xs={12}>
								<Box mb={2}>
									<Text type={'h3'}>Public Key</Text>
								</Box>
								<CopiableText text={account.publicKey}>{account.publicKey}</CopiableText>
							</Grid>
						</Grid>
						<Grid row>
							<Grid xs={12}>
								<Box mb={2}>
									<Text type={'h3'}>Passphrase</Text>
								</Box>
								<CopiableText text={account.passphrase ?? ''}>{account.passphrase}</CopiableText>
							</Grid>
						</Grid>
					</Grid>
				)}
			</DialogBody>
		</Dialog>
	);
};

export default AccountDialog;
