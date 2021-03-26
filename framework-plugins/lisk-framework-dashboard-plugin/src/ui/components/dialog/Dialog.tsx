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

interface DialogProps {
	open: boolean;
	onOpen?: () => void;
	onClose?: () => void;
}

export interface DialogChildProps {
	closeDialog?: () => void;
}

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

	const childrenWithProps = React.Children.map(props.children, child => {
		// checking isValidElement is the safe way and avoids a typescript error too
		if (React.isValidElement(child)) {
			return React.cloneElement(child, { closeDialog: triggerClose });
		}
		return child;
	});

	return (
		<div className={`${styles.root} ${open ? styles.open : styles.close}`}>
			<div className={styles.background}>
				<div className={styles.modal}>{childrenWithProps}</div>
			</div>
		</div>
	);
};

export default Dialog;
