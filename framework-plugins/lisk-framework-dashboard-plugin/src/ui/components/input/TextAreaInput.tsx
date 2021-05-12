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
import Editor from 'react-simple-code-editor';
import formatHighlight from 'json-format-highlight';
import styles from './Input.module.scss';
import { jsonHightlight } from '../../utils/json_color';

interface Props {
	placeholder?: string;
	value?: string;
	onChange?: (val: string) => void;
	size?: 's' | 'm' | 'l';
	json?: boolean;
}

const TextAreaInput: React.FC<Props> = props => {
	const { placeholder } = props;
	const size = props.size ?? 'm';

	const handleOnChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		if (props.onChange) {
			props.onChange(event.target.value);
		}
	};

	if (props.json) {
		let height = '136px';
		if (size === 's') {
			height = '90px';
		} else if (size === 'l') {
			height = '248px';
		}
		let validJSON = true;
		try {
			JSON.parse(props.value ?? '');
		} catch (error) {
			validJSON = false;
		}
		const border = validJSON ? '1px solid rgba(223, 230, 242, 0.2)' : '1px solid #ff4557';
		return (
			<Editor
				value={props.value ?? ''}
				onValueChange={val => {
					if (props.onChange) {
						props.onChange(val);
					}
				}}
				// eslint-disable-next-line
				highlight={code => formatHighlight(code, jsonHightlight)}
				padding={10}
				textareaClassName={`${styles.textArea} ${styles[`textArea-${size}`]}`}
				style={{
					fontFamily: 'Roboto',
					color: '#8a8ca2',
					fontSize: '14px',
					lineHeight: '18px',
					border,
					borderRadius: '3px',
					height,
					overflowY: 'auto',
				}}
			/>
		);
	}

	return (
		<textarea
			value={props.value}
			placeholder={placeholder}
			className={`${styles.textArea} ${styles[`textArea-${size}`]}`}
			onChange={handleOnChange}
		></textarea>
	);
};

export default TextAreaInput;
