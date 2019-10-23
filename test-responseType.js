'use strict'
/* eslint-env mocha */

const request = require('supertest')
const assert = require('assert')
const { strictEqual } = assert

const configuration = {
    clients: [{
      client_id: 'myClient',
      client_secret: 'mySecret',
      redirect_uris: ['http://127.0.0.1:8080/cb']
    }],
    responseTypes: ['code']
  }

const app = require('./app')(configuration)

describe('Testing Issues', function () {
    
    before('Start server', function (cb) {
        this.server = app.listen(5000, cb)
    })
    
    after('Stop server', function (cb) {
        this.server.close(cb)
    })

    it('should fail because response type is not suported', function () {
        return request(this.server)
            .get('/auth')
            .query({
                response_type: 'id_token',
                client_id: 'myClient',
                scope: 'openid',
                redirect_uri: 'http://127.0.0.1:8080/cb'
              })
          .expect(302)
          .expect((response) => {
            const locURL = new URL(response.header.location.replace("#", "?"))
            console.log(locURL)
            strictEqual(locURL.searchParams.get('error'), 'unsupported_response_type')
            strictEqual(locURL.searchParams.get('error_description'), 'unsupported response_type requested')
          })
      })
})

/*
 The problem seem to be in the middleware order, if we look on lib/actions/authorization/index.js file the "checkResponseType" 
 middleware is below the "oidcRequired" middleware, but this check don;t have sense if the response type is not supported.
*/


