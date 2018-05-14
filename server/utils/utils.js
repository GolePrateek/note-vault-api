const rand = require('csprng');
const pbkdf2 = require('pbkdf2');
const bcrypt = require('bcryptjs');
const cryptojs = require('crypto-js');
const jwt = require('jsonwebtoken');

let generateEncryptionKey = ()=>rand(160,36);

let generateSalt = ()=>{
  return new Promise((resolve,reject)=>{
    bcrypt.genSalt(10, (err, salt)=>{
        resolve(salt);
    });
  });
}

let generateDerivedKey = (secret,salt)=>{
  return new Promise((resolve,reject)=>{
    pbkdf2.pbkdf2(secret, salt, 200000, 32, 'sha512', function(err,key){
      resolve(key.toString('hex'));
    });
  });
};

let encryptText = (plainText,key)=>{
  return cryptojs.AES.encrypt(plainText, key).toString();
};

let decryptText = (cipherText,key)=>{
  let bytes  = cryptojs.AES.decrypt(cipherText, key);
  return bytes.toString(cryptojs.enc.Utf8);
};

let encryptNoteBody = (noteObject,encryptionKey)=>{
  Object.keys(noteObject).forEach((key)=>{
    if(key==='title'||key==='text'){
      noteObject[key] = encryptText(noteObject[key],encryptionKey);
    }
  });
}

let getEncryptionKey = (user,token)=>{
    let derivedKey = jwt.verify(token,process.env.JWT_SECRET).userKey;
    return decryptText(user.encryptionKey,derivedKey);
};

let cryptoMagic = async (body)=>{
  let encryptionKey = generateEncryptionKey();
  let keySalt = await generateSalt();
  let derivedKey = await generateDerivedKey(body['password'],keySalt);
  body['derivedKeySalt'] = keySalt;
  body['encryptionKey'] = encryptText(encryptionKey,derivedKey);

  return derivedKey;
};

module.exports = {
  generateEncryptionKey,
  generateSalt,
  generateDerivedKey,
  cryptoMagic,
  encryptText,
  decryptText,
  encryptNoteBody,
  getEncryptionKey
};
