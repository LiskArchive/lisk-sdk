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
	name: string;
	size?: 's' | 'm' | 'l' | 'xl';
}

const onSubmit = (): void => undefined;

const IconButton: React.FC<Props> = props => {
	const { name } = props;
	const size = props.size ?? 'm';
	return <div className={styles['icon-button']} onClick={onSubmit}><Icon name={name} size={size} /></div>;
};

export default IconButton;
