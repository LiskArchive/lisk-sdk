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
import IconButton from '../IconButton';
import styles from './Dialog.module.scss';
import { DialogChildProps } from './Dialog';

const DialogHeader: React.FC<DialogChildProps> = props => {
	const triggerClose = () => {
		if (props.closeDialog) {
			props.closeDialog();
		}
	};

	return (
		<div className={styles.header}>
			<div className={styles.headerContent}>{props.children}</div>
			<IconButton icon={'close'} size={'l'} onClick={triggerClose}></IconButton>
		</div>
	);
};

export default DialogHeader;
