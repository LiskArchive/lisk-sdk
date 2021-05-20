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
import Icon from '../Icon';
import styles from './IconButton.module.scss';

interface Props {
	icon: string;
	onClick?: (event: React.MouseEvent | Event) => void;
	size?: 's' | 'm' | 'l' | 'xl';
}

const IconButton: React.FC<Props> = props => {
	const { icon, onClick } = props;
	const size = props.size ?? 'm';
	return (
		<div className={styles['icon-button']} onClick={onClick}>
			<Icon name={icon} size={size} />
		</div>
	);
};

export default IconButton;
