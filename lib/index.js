var Boom = require('boom');
var Hoek = require('hoek');
var Wreck = require('wreck');

// Declare Internals

var internals = {};


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
    Hoek.assert(options.validateFunc && typeof options.validateFunc === 'function', 'options.validateFunc must be a valid function in scheme');

    options.tokenType = 'x-parse-session-token';

    var settings = Hoek.clone(options);

    var scheme = {
        authenticate: function (request, reply) {

            var req = request;
            var token = req.headers['x-parse-session-token'];

            if (!token) {
                return reply(Boom.unauthorized(null, options.tokenType));
            }

            // Authenticate via Parse REST API
            var method = 'GET';
            var uri    = 'https://api.parse.com/1/users/me';
            var opts = {
                headers: {
                    'X-Parse-Session-Token': token,
                    'X-Parse-Application-Id': 'secret',
                    'X-Parse-REST-API-Key': 'secret'
                }
            };

            Wreck.request(method, uri, opts, function (err, res, payload) {

                Wreck.read(res, { json: true }, function (err, body) {
                    console.log('sttaus', res.statusCode);
                    console.log('body:', body);

                    var credentials = body;

                    if (err) {
                        return reply(err, { credentials: credentials, log: { tags: ['auth', 'parse'], data: err } });
                    }

                    if (res.statusCode === 101) {
                        return reply(Boom.unauthorized('Bad token', options.tokenType), { credentials: credentials });
                    }

                    if (!credentials || typeof credentials !== 'object') {
                        return reply(Boom.badImplementation('Missing credentials from Parse'), { log: { tags: 'token' } });
                    }

                    if (settings.validateFunc) {

                        settings.validateFunc.call(request, credentials, function (err, credentials) {

                            return reply.continue({ credentials: credentials });
                        });
                    } else {
                        return reply.continue({ credentials: credentials });
                    }
                });
            });
        }
    };

    return scheme;
};
