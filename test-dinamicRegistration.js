'use strict'
/* eslint-env mocha */

const request = require('supertest')
const assert = require('assert')
const fs = require('fs')
const { strictEqual } = assert
const jwt = require('jsonwebtoken')

const jwks = require('./resources/jwks.json')

const CLIENT_ID = 'myClient'

const configuration = {
    clients: [{
      client_id: CLIENT_ID,
      client_secret: 'mySecret',
      redirect_uris: ['http://127.0.0.1:8080/cb'],
      token_endpoint_auth_method: 'private_key_jwt',
      token_endpoint_auth_signing_alg: 'RS256',
      jwks: {
        keys: [{
          kty: 'RSA',
          e: 'AQAB',
          kid: '7Mr9wAwdM3cisMqeWZBDvgzPjopnFYnnhJs7M3kbHHE',
          n: '2l8TswKqLqq3dhbnQHl4mG01FHL7s_CmOOZyyf53gf4BpbM43lrXXezSUOYqFddQaLI0HzOt6yqYt4RRl2O1p34dxADNR11dn0A863NqW6VmE3lkrxnU_db_JOk_ZXy6kp_GBO79n35LRp8YUIBz_og6n_5TZ_kbG24d5sG60QOffRo5ogtplAlwjN3kYp8Ik9AM4fsXWUGIXygKjHd9zOT1lFkb49oe_-kIEoNrDh4rv1pu3R5eSUwuih1ppRNstS3ufwtQJ6ZvA4uXNPuj6TvQyNgJXeA3HzaLetIArULHQQqns0UP8UApFYZoxZq0SqsgYcSndvSkmo5V_qxE7w'
        }]
      }
    }],
    jwks,
    features: {
      registration: { enabled: true },
      requestObjects: {
        mergingStrategy: {
          name: 'strict'
        }
      },
      pushedAuthorizationRequests: {
        enabled: true,
        requestParamRequired: true
      }
    }
  }

const app = require('./app')(configuration)

describe('Testing Issues', function () {
    
    before('Start server', function (cb) {
        this.server = app.listen(5000, cb)
    })
    
    after('Stop server', function (cb) {
        this.server.close(cb)
    })

    it('should allow regster new clients', async function () {
        
      const newClient = {
        redirect_uris: ['http://127.0.0.1:8080/cb'],
        client_name: 'Client Example Name',
        logo_uri: 'https://mylogo.jpeg',
        policy_uri: 'https://privacy-hub.com',
        tos_uri: 'https://terms-conditions-acceptance.com',
        application_type: 'web',
        token_endpoint_auth_method: 'private_key_jwt',
        token_endpoint_auth_signing_alg: 'RS256',
        jwks: {
          keys: [{
            kty: 'RSA',
            e: 'AQAB',
            kid: '7Mr9wAwdM3cisMqeWZBDvgzPjopnFYnnhJs7M3kbHHE',
            n: '2l8TswKqLqq3dhbnQHl4mG01FHL7s_CmOOZyyf53gf4BpbM43lrXXezSUOYqFddQaLI0HzOt6yqYt4RRl2O1p34dxADNR11dn0A863NqW6VmE3lkrxnU_db_JOk_ZXy6kp_GBO79n35LRp8YUIBz_og6n_5TZ_kbG24d5sG60QOffRo5ogtplAlwjN3kYp8Ik9AM4fsXWUGIXygKjHd9zOT1lFkb49oe_-kIEoNrDh4rv1pu3R5eSUwuih1ppRNstS3ufwtQJ6ZvA4uXNPuj6TvQyNgJXeA3HzaLetIArULHQQqns0UP8UApFYZoxZq0SqsgYcSndvSkmo5V_qxE7w'
          }]
        }
      }
      
      const response = await request(this.server)
          .post('/reg')
          .send(newClient)
          .expect(201)

      console.log(response.body)

    })
})