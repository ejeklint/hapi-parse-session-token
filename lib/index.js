'use strict';

const Boom = require('boom');
const Hoek = require('hoek');
const Wreck = require('wreck');

// Declare Internals

const internals = {};


exports.register = function (server, options, next) {

    server.auth.scheme('parse-access-token', internals.implementation);
    next();
};

exports.register.attributes = {
    pkg: require('../package.json')
};

internals.implementation = function (server, options) {

    Hoek.assert(options, 'Missing Parse auth strategy options');
    Hoek.assert(options.parse_rest_api_key, 'Missing parse_rest_api_key');
    Hoek.assert(options.parse_app_id, 'Missing parse_app_id');
    Hoek.assert(!options.validatedFunc || typeof options.validatedFunc === 'function', 'options.validatedFunc must be a valid function in scheme');

    options.tokenType = 'x-parse-session-token';

    const settings = Hoek.clone(options);

    const scheme = {
        authenticate: function (request, reply) {

            const token = request.headers['x-parse-session-token'];

            if (!token) {
                return reply(Boom.unauthorized(null, options.tokenType));
            }

            // Authenticate via Parse REST API

            const opts = {
                headers: {
                    'X-Parse-Session-Token': token,
                    'X-Parse-Application-Id': options.parse_app_id,
                    'X-Parse-REST-API-Key': options.parse_rest_api_key
                }
            };

            Wreck.request('GET', 'https://api.parse.com/1/users/me', opts, (err, res, payload) => {

                if (err) {
                    return reply(err, { credentials: credentials, log: { tags: ['auth', 'parse'], data: err } });
                }

                if (res.statusCode !== 200) {
                    return reply(Boom.unauthorized('Bad token', options.tokenType), { credentials: null });
                }

                Wreck.read(res, { json: true }, (err, credentials) => {

                    if (!settings.validatedFunc) {
                        return reply.continue({ credentials: credentials });
                    }

                    settings.validatedFunc.call(request, credentials, (err, decoratedCredentials) => {

                        if (!decoratedCredentials || typeof decoratedCredentials !== 'object') {
                            return reply(Boom.badImplementation('Missing credentials'), { log: { tags: 'token' } });
                        }

                        return reply.continue({ credentials: decoratedCredentials });
                    });
                });
            });
        }
    };

    return scheme;
};
