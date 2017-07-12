import config from '../../config.json';
import lisk from 'lisk-js';

export default lisk.api(config.liskJS);
