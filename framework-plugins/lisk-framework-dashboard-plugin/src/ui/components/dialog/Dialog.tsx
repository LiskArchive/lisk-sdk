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
import styles from './Dialog.module.scss';

export interface DialogProps {
	open: boolean;
	onOpen?: () => void;
	onClose?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const DialogContext = React.createContext({ closeDialog: () => {} });

const Dialog: React.FC<DialogProps> = props => {
	const [open, setOpen] = React.useState(props.open);

	const triggerClose = () => {
		setOpen(false);
		if (props.onClose) {
			props.onClose();
		}
	};

	const triggerOpen = () => {
		setOpen(true);
		if (props.onOpen) {
			props.onOpen();
		}
	};

	React.useEffect(() => {
		if (props.open) {
			triggerOpen();
		} else {
			triggerClose();
		}
	}, [props.open]);

	return (
		<div className={`${styles.root} ${open ? styles.open : styles.close}`}>
			<div className={styles.background}>
				<div className={styles.modal}>
					<DialogContext.Provider value={{ closeDialog: triggerClose }}>
						{props.children}
					</DialogContext.Provider>
				</div>
			</div>
		</div>
	);
};

export default Dialog;
