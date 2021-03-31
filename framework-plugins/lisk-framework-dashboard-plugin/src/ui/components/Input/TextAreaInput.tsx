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
import styles from './Input.module.scss';

interface Props {
	placeholder?: string;
	value?: string;
}

const TextAreaInput: React.FC<Props> = props => {
	const { placeholder } = props;
	const [value, updateValue] = React.useState(props.value);

	const onChange = (val: string) => {
		updateValue(val);
	};

	return (
		<textarea
			value={value}
			placeholder={placeholder}
			className={styles.textArea}
			onChange={e => onChange(e.target.value)}
		/>
	);
};

export default TextAreaInput;
