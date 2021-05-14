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
import styles from './Button.module.scss';

interface Props {
	onClick?: (event: React.MouseEvent | Event) => void;
	size?: 's' | 'm' | 'l' | 'xl';
	disabled?: boolean;
}

const Button: React.FC<Props> = props => {
	const { onClick } = props;
	const size = props.size ?? 'm';
	return (
		<button
			className={`${styles.button} ${styles[`button-${size}`]}`}
			onClick={onClick}
			disabled={props.disabled}
		>
			{props.children}
		</button>
	);
};

export default Button;
