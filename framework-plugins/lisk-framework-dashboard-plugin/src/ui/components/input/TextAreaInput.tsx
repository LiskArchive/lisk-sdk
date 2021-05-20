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
import formatHighlight from 'json-format-highlight';
import styles from './Input.module.scss';
import { jsonHighlight } from '../../utils/json_color';

interface Props {
	placeholder?: string;
	value?: string;
	onChange?: (val: string) => void;
	size?: 's' | 'm' | 'l';
	json?: boolean;
	readonly?: boolean;
}

const TextAreaInput: React.FC<Props> = props => {
	const { placeholder } = props;
	const size = props.size ?? 'm';

	const handleOnChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		if (props.onChange) {
			props.onChange(event.target.value);
		}
	};

	const editorRef = React.useRef(null);

	if (props.json) {
		let validJSON = true;
		try {
			JSON.parse(props.value ?? '');
		} catch (error) {
			validJSON = false;
		}
		const showHighlightJSON = (data?: string): string =>
			// eslint-disable-next-line
			formatHighlight(data, jsonHighlight);
		const syncScroll = (val: any) => {
			if (!editorRef?.current) {
				return;
			}
			// eslint-disable-next-line
			const node = editorRef.current as any;
			// eslint-disable-next-line
			node.scrollTop = val.currentTarget.scrollTop;
			// eslint-disable-next-line
			node.scrollLeft = val.currentTarget.scrollLeft;
		};
		return (
			<div
				className={`${styles.editor} ${styles[`textArea-${size}`]} ${
					validJSON ? '' : styles['editor-error']
				}`}
			>
				{!props.readonly && (
					<textarea
						className={`${styles.textArea} ${styles['editor-textarea']}`}
						spellCheck={false}
						defaultValue={props.value}
						onScroll={val => {
							syncScroll(val);
						}}
						onInput={val => {
							if (props.onChange) {
								props.onChange(val.currentTarget.value);
							}
							syncScroll(val);
						}}
					/>
				)}
				<pre className={styles['editor-code']} ref={editorRef}>
					<code dangerouslySetInnerHTML={{ __html: showHighlightJSON(props.value) }} />
				</pre>
			</div>
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
