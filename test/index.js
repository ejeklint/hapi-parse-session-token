var Lab = require('lab');
var Code = require('code');
var Hapi = require('hapi');
var nock = require('nock');
var lab = exports.lab = Lab.script();

var expect = Code.expect;
var before = lab.before;
var after = lab.after;
var it = lab.it;


var defaultHandler = function (request, reply) {

    reply('success');
};


var defaultvalidatedFunc = function (credentials, callback) {

    return callback(null, { credentials: credentials });
};


var alwaysErrorvalidatedFunc = function (credentials, callback) {

    return callback({ Error:'Error' }, null);
};


var noCredentialsvalidatedFunc = function (credentials, callback) {

    return callback(null, null);
};


var server = new Hapi.Server({ debug: false });
server.connection();


before(function (done){

    server.register(require('../'), function (err) {

        expect(err).to.not.exist();

        server.auth.strategy('default', 'parse-access-token', {
            parse_rest_api_key: 'hwilaVidMinmila',
            parse_app_id: 'hemligt',
            validatedFunc: defaultvalidatedFunc
        });

        server.auth.strategy('no_valid_function', 'parse-access-token', {
            parse_rest_api_key: 'hwilaVidMinmila',
            parse_app_id: 'hemligt'
        });

        server.auth.strategy('with_error', 'parse-access-token', {
            parse_rest_api_key: 'hwilaVidMinmila',
            parse_app_id: 'hemligt',
            validatedFunc: alwaysErrorvalidatedFunc
        });

        server.auth.strategy('missing_credential', 'parse-access-token', {
            parse_rest_api_key: 'hwilaVidMinmila',
            parse_app_id: 'hemligt',
            validatedFunc: noCredentialsvalidatedFunc
        });

        server.route([
            { method: 'POST', path: '/basic', handler: defaultHandler, config: { auth: 'default' } },
            { method: 'POST', path: '/basic_no_function', handler: defaultHandler, config: { auth: 'no_valid_function' } },
            { method: 'GET', path: '/basic_validate_error', handler: defaultHandler, config: { auth: 'with_error' } },
            { method: 'GET', path: '/no_credentials', handler: defaultHandler, config: { auth: 'missing_credential' } }
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


it('returns 200 and success with correct parse token header set and no valid function', function (done) {

    var request = { method: 'POST', url: '/basic_no_function', headers: { 'X-Parse-Session-Token': 'abcd1234' } };

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


it('returns 401 when wrong parse token header set', function (done) {

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


it('returns 401 error with bearer token type of object (invalid token)', function (done) {

    var headers = {};
    headers['X-Parse-Session-Token'] = '{wrong: true}';

    var request = { method: 'POST', url: '/basic', headers: headers };

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


it('returns 401 when wrong parse token header set', function (done) {

    var request = { method: 'GET', url: '/basic_validate_error', headers: { 'X-Parse-Session-Token': 'attans' } };

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


it('returns 500 when error', function (done) {

    var request = { method: 'POST', url: '/basic', headers: { 'X-Parse-Session-Token': 'abcd1234' } };

    nock('https://api.parse.com')
        .get('/1/users/me')
        .replyWithError('Aaargh!');

    server.inject(request, function (res) {

        expect(res.statusCode).to.equal(500);
        done();
    });
});


it('returns 500 when credentials are missing', function (done) {

    var request = { method: 'GET', url: '/no_credentials', headers: { 'X-Parse-Session-Token': 'abcd1234' } };

    nock('https://api.parse.com')
        .get('/1/users/me')
        .reply(200, null);

    server.inject(request, function (res) {

        expect(res.statusCode).to.equal(500);
        done();
    });
});


it('returns 401 error when no Parse token is set', function (done) {

    var request = { method: 'POST', url: '/basic' };

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
