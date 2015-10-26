# Parse session token validation for Hapi
[![Build Status](https://travis-ci.org/ejeklint/hapi-parse-session-token.svg?branch=master)](https://travis-ci.org/ejeklint/hapi-parse-session-token) [![Code Climate](https://codeclimate.com/github/ejeklint/hapi-parse-session-token/badges/gpa.svg)](https://codeclimate.com/github/ejeklint/hapi-parse-session-token) [![Test Coverage](https://codeclimate.com/github/ejeklint/hapi-parse-session-token/badges/coverage.svg)](https://codeclimate.com/github/ejeklint/hapi-parse-session-token/coverage)

Lead Maintainer: [Per Ejeklint](https://github.com/ejeklint)

_TODO: Update_

Parse Token authentication requires valid Parse keys and a session token passed in. The `'parse-access-token'` scheme takes the following options:

- `options` - (optional)
    - `parse_rest_api_key` (required) - the Parse REST API key.
    - `parse_app_id` (required) - the Parse App ID.
    - `validatedFunc` - (optional) function called after successful validation with the signature `function(credentials, callback)` where:
        - `credentials` - an object with the credentials received from Parse.
        - `callback` - a callback function with the signature `function(err, credentials)` where:
            - `err` - an internal error.
            - `credentials` - a credentials object passed back to the application in `request.auth.credentials`.

```javascript
var Hapi = require('hapi');

var server = new Hapi.Server();
server.connection({ port: 3000 });

server.register(require('hapi-parse-session-token'), function (err) {

    server.auth.strategy('parse', 'parse-access-token', {
        parse_rest_api_key: 'abc123,
        parse_app_id: 'def456'
        validatedFunc: function( credentials, callback ) {

            credentials.extras = 'kilroy was here';
            
            callback(null, credentials)
        }
    });
});

server.route({
    method: 'GET',
    path: '/protected',
    handler: function (request, reply) {
        reply('success');
    },
    config: { auth: 'parse' }
});

server.start(function () {
    console.log('Server started at: ' + server.info.uri);
})
```

License MIT @ Per Ejeklint 2015
