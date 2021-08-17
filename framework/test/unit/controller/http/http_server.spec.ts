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
import * as HTTP from 'http';
import { HTTPServer } from '../../../../src/controller/http/http_server';

describe('HTTPServer', () => {
  const config = {
    port: 8000,
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      trace: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      fatal: jest.fn(),
      level: jest.fn(),
    },
  };
  let httpServerInstance: HTTPServer;
  const httpRequestListener = jest.fn();

  describe('constructor()', () => {
    it('should setup class properties based on config', () => {
      httpServerInstance = new HTTPServer(config);
      expect(httpServerInstance['port']).toBe(config.port);
      expect(httpServerInstance['logger']).toBe(config.logger);
    });
  });

  describe('start()', () => {
    beforeEach(() => {
      httpServerInstance = new HTTPServer(config);
      httpServerInstance.start(httpRequestListener);
    });

    afterEach(() => {
      httpServerInstance.stop();
    });

    it('should create a HTTPServer instance', () => {
      // Assert
      expect(httpServerInstance.server).toBeInstanceOf(HTTP.Server);
    });

    it('should setup event handlers', () => {
      // Assert
      expect(httpServerInstance.server.eventNames()).toEqual([
        'request',
        'connection',
        'listening',
        'error',
      ]);
    });
  });

  describe('stop()', () => {
    it('should call stop on the HTTP server', () => {
      httpServerInstance = new HTTPServer(config);
      httpServerInstance.start(httpRequestListener);
      const stopSpy = jest.spyOn(httpServerInstance.server, 'close');
      httpServerInstance.stop();
      expect(stopSpy).toHaveBeenCalled();
    });
  });
});
