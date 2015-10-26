var Lab = require('lab');
var Code = require('code');
var Hapi = require('hapi');
var Boom = require('boom');
var nock = require('nock');
var lab = exports.lab = Lab.script();

var expect = Code.expect;
var before = lab.before;
var after = lab.after;
var it = lab.it;


var defaultHandler = function (request, reply) {

    reply('success');
};


var defaultValidateFunc = function (token, callback) {

    return callback(null, token === 'abcd1234',  { token: token });
};


var alwaysRejectValidateFunc = function (token, callback) {

    return callback(null, false, { token: token });
};


var alwaysErrorValidateFunc = function (token, callback) {

    return callback({ Error:'Error' }, false, null);
};


var boomErrorValidateFunc = function (token, callback) {

    return callback(Boom.badImplementation('test info'), false, null);
};

var noCredentialsValidateFunc = function (token, callback) {

    return callback(null, true, null);
};


var server = new Hapi.Server({ debug: false });
server.connection();


before(function (done){

    server.register(require('../'), function (err) {

        expect(err).to.not.exist();

        server.auth.strategy('default', 'parse-access-token', {
            parse_rest_api_key: 'hwilaVidMinmila',
            parse_app_id: 'hemligt',
            validateFunc: defaultValidateFunc
        });

        server.auth.strategy('always_reject', 'parse-access-token', {
            parse_rest_api_key: 'hwilaVidMinmila',
            parse_app_id: 'hemligt',
            validateFunc: alwaysRejectValidateFunc
        });

        server.auth.strategy('with_error_strategy', 'parse-access-token', {
            parse_rest_api_key: 'hwilaVidMinmila',
            parse_app_id: 'hemligt',
            validateFunc: alwaysErrorValidateFunc
        });

        server.auth.strategy('boom_error_strategy', 'parse-access-token', {
            parse_rest_api_key: 'hwilaVidMinmila',
            parse_app_id: 'hemligt',
            validateFunc: boomErrorValidateFunc
        });

        server.auth.strategy('missing_credential_strategy', 'parse-access-token', {
            parse_rest_api_key: 'hwilaVidMinmila',
            parse_app_id: 'hemligt',
            validateFunc: noCredentialsValidateFunc
        });

        server.route([
            { method: 'POST', path: '/basic', handler: defaultHandler, config: { auth: 'default' } },
            { method: 'GET', path: '/basic_validate_error', handler: defaultHandler, config: { auth: 'with_error_strategy' } },
            { method: 'GET', path: '/boom_validate_error', handler: defaultHandler, config: { auth: 'boom_error_strategy' } },
            { method: 'GET', path: '/always_reject', handler: defaultHandler, config: { auth: 'always_reject' } },
            { method: 'GET', path: '/no_credentials', handler: defaultHandler, config: { auth: 'missing_credential_strategy' } }
        ]);

        done();
    });
});


after(function (done) {

    server = null;
    done();
});


it('returns 200 and success with correct parse token header set', function (done) {

    var request = { method: 'POST', url: '/basic', headers: { 'X-Parse-Session-Token': 'abcd1234' } };

    nock('https://api.parse.com')
        .get('/1/users/me')
        .reply(200, {
            'username': 'cooldude6',
            'phone': '415-392-0202',
            'createdAt': '2011-11-07T20:58:34.448Z',
            'updatedAt': '2011-11-07T20:58:34.448Z',
            'objectId': 'g7y9tkhB7O'
        });

    server.inject(request, function (res) {

        expect(res.statusCode).to.equal(200);
        expect(res.result).to.equal('success');
        done();
    });
});

it('returns 101 and fails with wrong parse token header set', function (done) {

    var request = { method: 'POST', url: '/basic', headers: { 'X-Parse-Session-Token': 'attans' } };

    nock('https://api.parse.com')
        .get('/1/users/me')
        .reply(101, {
            'error': 'Unauthorized'
        });

    server.inject(request, function (res) {

        expect(res.statusCode).to.equal(401);
        done();
    });
});

/*
it('returns 401 error when no Parse token is set', function (done) {

    var request = { method: 'POST', url: '/basic' };

    server.inject(request, function (res) {

        expect(res.statusCode).to.equal(401);
        done();
    });
});


it('returns 401 when Parse token is wrong', function (done) {

    var header = {};
    header['X-Parse-Session-Token'] = 'FetChansGubbeLilla';

    var request = { method: 'POST', url: '/basic', headers: header };

    server.inject(request, function (res) {

        expect(res.statusCode).to.equal(401);
        done();
    });
});


it('returns 401 error with bearer token type of object (invalid token)', function (done) {

    var headers = {};
    headers['X-Parse-Session-Token'] = '{wrong: true}';

    var request = { method: 'POST', url: '/basic', headers: headers };

    server.inject(request, function (res) {

        expect(res.statusCode).to.equal(401);
        done();
    });
});


it('returns 500 when strategy returns a regular object to validateFunc', function (done) {

    var header = {};
    header['X-Parse-Session-Token'] = 'abcd1234';

    var request = { method: 'GET', url: '/basic_validate_error', headers: header };
    server.inject(request, function (res) {

        expect(res.statusCode).to.equal(200);
        expect(JSON.stringify(res.result)).to.equal('{\"Error\":\"Error\"}');
        done();
    });
});


it('returns 500 when strategy returns a Boom error to validateFunc', function (done) {

    var header = {};
    header['X-Parse-Session-Token'] = 'abcd1234';

    var request = { method: 'GET', url: '/boom_validate_error', headers: header };
    server.inject(request, function (res) {

        expect(res.statusCode).to.equal(500);
        expect(JSON.stringify(res.result)).to.equal('{\"statusCode\":500,\"error\":\"Internal Server Error\",\"message\":\"An internal server error occurred\"}');
        done();
    });
});


it('returns 401 handles when isValid false passed to validateFunc', function (done) {

    var header = {};
    header['X-Parse-Session-Token'] = 'abcd1234';

    var request = { method: 'GET', url: '/always_reject', headers: header };
    server.inject(request, function (res) {

        expect(res.statusCode).to.equal(401);
        done();
    });
});

it('returns 500 when credentials are missing', function (done) {

    var header = {};
    header['X-Parse-Session-Token'] = 'abcd1234';

    var request = { method: 'GET', url: '/no_credentials', headers: header };
    server.inject(request, function (res) {

        expect(res.statusCode).to.equal(500);
        done();
    });
});
*/
