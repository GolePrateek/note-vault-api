const request = require('supertest');
const {ObjectID} = require('mongodb');
const {app} = require('./../server');

describe('Add a user',()=>{
  it('should add a user',()=>{
    request(app)
      .post('/users')
      .send({
        name:"prateek",
        email:"goleprateek@gmail.com",
        password:"qwerty1234"
      })
      .expect(200)
      .expect(function(res){
        expect(res.body.email).toBe('goleprateek@gmail.com');
        expect(ObjectID.isValid(res.body._id)).toBeTruthy();
      })
  })
});
