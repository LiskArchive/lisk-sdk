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
import styles from './Icon.module.scss';

export interface Props {
	name: string;
	size?: 's' | 'm' | 'l' | 'xl';
}

const Icon: React.FC<Props> = props => {
	const { name } = props;
	const size = props.size ?? 'm';
	return <span className={`${styles.icon} ${styles[`icon-${size}`]}`}>{name}</span>;
};

export default Icon;
