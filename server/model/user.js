const mongoose = require('mongoose');
const validator  = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const bcrypt = require('bcryptjs');

const {generateDerivedKey} = require('./../utils/utils');

var UserSchema = new mongoose.Schema({
  name:{
    type:String,
    required:true,
    lowercase:true,
    trim:true,
    minlength:1
  },
  password: {
    type:String,
    required:true,
    minlength:6
  },
  derivedKeySalt: {
    type:String,
    required:true
  },
  encryptionKey:{
    type:String,
    required:true
  },
  email:{
    type:String,
    unique:true,
    required:true,
    trim:true,
    minlength:1,
    validate:{
      validator : validator.isEmail,
      message: `{VALUE} is not a valid email`
    }
  },
  tokens:[{
    access:{
      type:String,
      required:true
    },
    token:{
      type:String,
      required:true
    }
  }]
});

UserSchema.methods.toJSON = function(){
  let user = this;
//  let userObject = user.toObject();
  return _.pick(user,['_id','name','email']);
};

UserSchema.methods.generateAuthTokenAlt = async function (userKey){
  let user = this;
  let access = 'auth';
  let token = jwt.sign({_id: user._id.toHexString(),userKey,access},process.env.JWT_SECRET);

  user.tokens = user.tokens.concat([{access,token}]);
  await user.save();
  return token;
};

UserSchema.methods.removeTokenAlt = async function (token){
  let user = this;
  return await user.update({
    $pull:{
      tokens:{ token }
    }
  });
};

UserSchema.statics.findByCredentialsAlt = async function (email,password){
  let User = this;

  var user = await User.findOne({email});
  if(!user){
    return new Promise.reject('User not found.');
  }

  return new Promise((resolve,reject)=>{
    bcrypt.compare(password, user.password, function(err,isMatch){
      if(isMatch){
        resolve(user);
      }
      reject({message:'Incorrect password',code:1001});
    });
  });
};

UserSchema.statics.findByTokenAlt = async function (token){
  try{
    let User = this;
    let decoded = jwt.verify(token,process.env.JWT_SECRET);

    let user = await User.findOne({
      _id:decoded._id,
      'tokens.token':token,
      'tokens.access':'auth'
    });

    let tokenTimeStamp = user.tokens.find(tkn=>tkn.token===token)._id.getTimestamp().getTime();
    if(tokenTimeStamp + 600000 < new Date().getTime()){
      user.removeTokenAlt(token);
      throw new Error();
    }
    return user;
  }
  catch(e){
      return new Promise.reject('Invalid token.');
  }
};

UserSchema.pre('save', function(next) {
    var user = this;

    if(user.isModified('password')){
      bcrypt.genSalt(10, (err, salt)=>{
          bcrypt.hash(user.password, salt, (err, hash)=>{
              user.password = hash;
              next();
          });
      });
    }
    else {
      next();
    }
});

var User = mongoose.model('User', UserSchema);

module.exports = { User };
