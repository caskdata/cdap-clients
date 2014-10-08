/**
 * Copyright © 2014 Cask Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */


(function (factory) {
    'use strict';

    // Support three module loading scenarios
    if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
        // [1] CommonJS/Node.js
        var target = module['exports'] || exports; // module.exports is for Node.js
        factory(target, require);
    } else if (typeof define === 'function' && define['amd']) {
        // [2] AMD anonymous module
        define(['exports', 'Promise'], factory);
    } else {
        // [3] No module loader (plain <script> tag) - put directly in global namespace
        factory(window);
    }
}(function (target, require) {
    'use strict';

    var moduleConstructor = function (username, password, hostname, port, ssl) {
        if (!username || !password) {
            throw new Error('"username" and "password" have to be defined');
        }

        var connectionInfo = {
                host: hostname || 'localhost',
                port: port || 10000,
                ssl: (null != ssl) ? ssl : false,
                user: username,
                pass: password
            },
            tokenInfo = {
                value: '',
                type: '',
                expirationDate: 0
            },
            httpConnection = null,
            authUrls = null,
            helpers = null,
            AUTH_HEADER_NAME = 'Authentication',
            AUTH_TYPE = 'Basic',
            TOKEN_EXPIRATION_TIMEOUT = 5000;

        if ('undefined' !== typeof window) {
            helpers = CDAPAuthHelpers.Browser;
            httpConnection = new XMLHttpRequest();
        } else {
            helpers = require('./helper-node');
            httpConnection = require('httpsync');
        }

        var getAuthHeaders = helpers.getAuthHeaders.bind(this, AUTH_HEADER_NAME, AUTH_TYPE, connectionInfo),
            baseUrl = function () {
                return [
                    connectionInfo.ssl ? 'https' : 'http',
                    '://', connectionInfo.host,
                    ':', connectionInfo.port, '/'
                ].join('');
            },
            fetchAuthUrl = helpers.fetchAuthUrl.bind(this, httpConnection, baseUrl()),
            getAuthUrl = function () {
                var authUrl;

                if (!authUrls) {
                    return '';
                }

                if (1 === authUrls.length) {
                    authUrl = authUrls[0];
                } else {
                    authUrl = authUrls[Math.floor(Math.random() * (authUrls.length - 1)) + 1];
                }

                return authUrl;
            },
            isAuthEnabledImpl = function () {
                if (!authUrls) {
                    authUrls = fetchAuthUrl();
                }

                return !!authUrls;
            },
            fetchToken = helpers.fetchTokenInfo.bind(this, getAuthUrl, httpConnection, getAuthHeaders,
                AUTH_HEADER_NAME),
            getTokenImpl = function () {
                if ((TOKEN_EXPIRATION_TIMEOUT >= (tokenInfo.expirationDate - Date.now()))) {
                    tokenInfo = fetchToken();
                }

                return {
                    token: tokenInfo.value,
                    type: tokenInfo.type
                };
            };

        return {
            isAuthEnabled: isAuthEnabledImpl,
            getToken: getTokenImpl
        };
    };

    if (('undefined' !== typeof module) && module.exports) {
        module.exports = moduleConstructor;
    } else {
        target['CASKAuthManager'] = target['CASKAuthManager'] || moduleConstructor;
    }
}));