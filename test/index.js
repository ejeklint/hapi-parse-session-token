'use strict';

const Lab = require('lab');
const Hapi = require('hapi');
const Code = require('code');
const nock = require('nock');
const lab = exports.lab = Lab.script();

const expect = Code.expect;
const before = lab.before;
const after = lab.after;
const it = lab.it;


const defaultHandler = function (request, reply) {

    reply('success');
};


const defaultvalidatedFunc = function (credentials, callback) {

    return callback(null, { credentials: credentials });
};


const alwaysErrorvalidatedFunc = function (credentials, callback) {

    return callback({ Error:'Error' }, null);
};


const noCredentialsvalidatedFunc = function (credentials, callback) {

    return callback(null, null);
};


let server = new Hapi.Server({ debug: false });
server.connection();


before((done) => {

    server.register(require('../'), (err) => {

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


after((done) => {

    server = null;
    done();
});


it('returns 200 and success with correct parse token header set', (done) => {

    const request = { method: 'POST', url: '/basic', headers: { 'X-Parse-Session-Token': 'abcd1234' } };

    nock('https://api.parse.com')
        .get('/1/users/me')
        .reply(200, {
            'username': 'cooldude6',
            'phone': '415-392-0202',
            'createdAt': '2011-11-07T20:58:34.448Z',
            'updatedAt': '2011-11-07T20:58:34.448Z',
            'objectId': 'g7y9tkhB7O'
        });

    server.inject(request, (res) => {

        expect(res.statusCode).to.equal(200);
        expect(res.result).to.equal('success');
        done();
    });
});


it('returns 200 and success with correct parse token header set and no valid function', (done) => {

    const request = { method: 'POST', url: '/basic_no_function', headers: { 'X-Parse-Session-Token': 'abcd1234' } };

    nock('https://api.parse.com')
        .get('/1/users/me')
        .reply(200, {
            'username': 'cooldude6',
            'phone': '415-392-0202',
            'createdAt': '2011-11-07T20:58:34.448Z',
            'updatedAt': '2011-11-07T20:58:34.448Z',
            'objectId': 'g7y9tkhB7O'
        });

    server.inject(request, (res) => {

        expect(res.statusCode).to.equal(200);
        expect(res.result).to.equal('success');
        done();
    });
});


it('returns 401 when wrong parse token header set', (done) => {

    const request = { method: 'POST', url: '/basic', headers: { 'X-Parse-Session-Token': 'attans' } };

    nock('https://api.parse.com')
        .get('/1/users/me')
        .reply(101, {
            'error': 'Unauthorized'
        });

    server.inject(request, (res) => {

        expect(res.statusCode).to.equal(401);
        done();
    });
});


it('returns 401 error with bearer token type of object (invalid token)', (done) => {

    const request = { method: 'POST', url: '/basic', headers: { 'X-Parse-Session-Token': '{wrong: true}' } };

    nock('https://api.parse.com')
        .get('/1/users/me')
        .reply(101, {
            'error': 'Unauthorized'
        });

    server.inject(request, (res) => {

        expect(res.statusCode).to.equal(401);
        done();
    });
});


it('returns 401 when wrong parse token header set', (done) => {

    const request = { method: 'GET', url: '/basic_validate_error', headers: { 'X-Parse-Session-Token': 'attans' } };

    nock('https://api.parse.com')
        .get('/1/users/me')
        .reply(101, {
            'error': 'Unauthorized'
        });

    server.inject(request, (res) => {

        expect(res.statusCode).to.equal(401);
        done();
    });
});


it('returns 500 when error', (done) => {

    const request = { method: 'POST', url: '/basic', headers: { 'X-Parse-Session-Token': 'abcd1234' } };

    nock('https://api.parse.com')
        .get('/1/users/me')
        .replyWithError('Aaargh!');

    server.inject(request, (res) => {

        expect(res.statusCode).to.equal(500);
        done();
    });
});


it('returns 500 when credentials are missing', (done) => {

    const request = { method: 'GET', url: '/no_credentials', headers: { 'X-Parse-Session-Token': 'abcd1234' } };

    nock('https://api.parse.com')
        .get('/1/users/me')
        .reply(200, null);

    server.inject(request, (res) => {

        expect(res.statusCode).to.equal(500);
        done();
    });
});


it('returns 401 error when no Parse token is set', (done) => {

    const request = { method: 'POST', url: '/basic' };

    nock('https://api.parse.com')
        .get('/1/users/me')
        .reply(101, {
            'error': 'Unauthorized'
        });

    server.inject(request, (res) => {

        expect(res.statusCode).to.equal(401);
        done();
    });
});
