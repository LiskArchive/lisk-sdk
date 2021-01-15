import { HTTPAPIPlugin, ForgerPlugin } from 'lisk-sdk';
import app from './app';

app.registerPlugin(HTTPAPIPlugin);
app.registerPlugin(ForgerPlugin);
