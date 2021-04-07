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
import Grid from '../Grid';
import Box from '../Box';
import Icon from '../Icon';
import styles from './PeersInfoDialog.module.scss';

interface PeerInfoDialogProps extends DialogProps {
	peersInfo: {
		connected: number;
		disconnected: number;
		banned: number;
	};
}

const PeersInfoDialog: React.FC<PeerInfoDialogProps> = props => {
	const { peersInfo, ...rest } = props;

	return (
		<Dialog {...rest}>
			<DialogHeader>
				<Text type={'h1'}>Peers Info</Text>
			</DialogHeader>
			<DialogBody>
				<Box className={styles.infoRow}>
					<Grid container fluid spacing={3}>
						<Grid row>
							<Grid md={4} xs={12}>
								<Box className={styles.infoBlockIcon}>
									<Icon name={'link'} size={'xl'} />
								</Box>
								<Box>
									<Text>Connected</Text>
									<Text type={'h1'}>{peersInfo.connected}</Text>
								</Box>
							</Grid>

							<Grid md={4} xs={12}>
								<Box className={styles.infoBlockIcon}>
									<Icon name={'link_off'} size={'xl'} />
								</Box>
								<Box>
									<Text>Disconnected</Text>
									<Text type={'h1'}>{peersInfo.disconnected}</Text>
								</Box>
							</Grid>

							<Grid md={4} xs={12}>
								<Box className={styles.infoBlockIcon}>
									<Icon name={'remove_done'} size={'xl'} />
								</Box>
								<Box>
									<Text>Banned</Text>
									<Text type={'h1'}>{peersInfo.banned}</Text>
								</Box>
							</Grid>
						</Grid>
					</Grid>
				</Box>
			</DialogBody>
		</Dialog>
	);
};

export default PeersInfoDialog;
