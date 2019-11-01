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
    }]
  }

const app = require('./app')(configuration)

describe('Testing Issues', function () {
    
    before('Start server', function (cb) {
        this.server = app.listen(5000, cb)
    })
    
    after('Stop server', function (cb) {
        this.server.close(cb)
    })

    it('should return logout success or say not session exist??', async function () {
        const { headers: { 'set-cookie' : cookies1 }} = await request(this.server)
            .get('/session/end')
            .expect(200)

        const { headers: { 'set-cookie' : cookies2 }} =  await request(this.server)
          .post('/session/end')
          .expect(200)
          .type('form')
        
        console.log(cookies1)
        
        assert(cookies1.length == 0)
        assert(cookies2.length == 0)
      })
})

/*
 The problem seem to be that inside  method get(ctx) from 'lib/model/session.js' when a session not exist a new one is created, 
 and this is the way that the middleware '../shared/session.js' get the session.
*/


