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
import styles from './text.module.scss';

interface Props {
	color?: 'green' | 'pink' | 'yellow' | 'blue' | 'white' | 'gray' | 'red';
	type?: 'h1' | 'h2' | 'h3' | 'th' | 'tr' | 'p';
}

export const Text: React.FC<Props> = props => {
	const color = props.color ?? 'white';
	const type = props.type ?? 'p';
	const styleProps = ['root'];
	styleProps.push(type);
	styleProps.push(`color_${color}`);
	const Tag = ['h1', 'h2', 'h3', 'p'].includes(type) ? type : 'p';
	return <Tag className={styleProps.map(prop => styles[prop]).join(' ')}>{props.children}</Tag>;
};
