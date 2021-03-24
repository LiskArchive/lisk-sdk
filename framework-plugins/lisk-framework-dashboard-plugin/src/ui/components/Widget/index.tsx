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
import styles from './Widget.module.scss';
import Text from '../Text';

interface Props {
	header?: React.ReactNode | string;
	size?: 'm' | 'l';
}

const Widget: React.FC<Props> = props => {
	const size = props.size ?? 'm';

	return (
		<div className={`${styles.root} ${styles[`widget-${size}`]}`}>
			<div className={styles.header}>
				{props.header && typeof props.header === 'string' ? (
					<Text type={'h2'}>{props.header}</Text>
				) : (
					props.header
				)}
			</div>
			<div className={styles.body}>{props.children}</div>
		</div>
	);
};

export default Widget;
