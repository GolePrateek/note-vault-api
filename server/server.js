require('./config/config.js');
const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');
const {ObjectID} = require('mongodb');

const {cryptoMagic,getEncryptionKey,generateDerivedKey,encryptNoteBody} = require('./utils/utils')
const {User} = require('./model/user');
const {Note} = require('./model/note');
const {mongoose} = require('./db/mongoose');
const {authentication} = require('./middleware/authentication');

const app = express();

app.use(bodyParser.json())

app.post('/users', async (req,res)=>{
  try{
    let body = _.pick(req.body,['name','email','password']);

    let derivedKey = await cryptoMagic(body);

    let user = new User(body);
    await user.save();
    const token = await user.generateAuthTokenAlt(derivedKey);
    res.header('x-auth',token).send(user);
  }catch(e){
    res.status(400).send({error:e.message,code:e.code});
  }
});

app.post('/users/login', async (req,res)=>{
  try{
    let values = _.pick(req.body,['email','password']);
    let user = await User.findByCredentialsAlt(values.email,values.password);
    let derivedKey = await generateDerivedKey(values.password,user.derivedKeySalt);
    let token = await user.generateAuthTokenAlt(derivedKey);
    res.set('x-auth',token).send(user);
  }catch(e){
    console.log(e);
    res.status(400).send({error:e.message,code:e.code})
  }
});

app.get('/users/me', authentication, async(req,res)=>{
  res.send(req.user);
});

app.delete('/users/me/token',authentication, async(req,res)=>{
  try{
    await req.user.removeTokenAlt(req.token);
    res.status(200).send();
  }catch(e){
    res.status(400).send();
  }
});

app.post('/notes',authentication,async(req,res)=>{
  try{
    let body = _.pick(req.body,['title','text']);
    body['creatorId']= req.user._id;
    let note = new Note(body);

    let encryptionKey = getEncryptionKey(req.user,req.token);
    note.encryptNote(encryptionKey);

    await note.save();
    res.send(note);
  }catch(e){
    res.status(400).send();
  }
});

app.get('/notes',authentication,async(req,res)=>{
  try{
    let notes = await Note.find({creatorId:req.user._id});

    let encryptionKey = getEncryptionKey(req.user,req.token);
    notes.forEach((note)=>{
      note.decryptNote(encryptionKey);
    });

    res.send(notes);
  }catch(e){
    res.status(500).send();
  }
});

app.patch('/notes/:id',authentication, async(req,res)=>{
  try{
    let id = req.params.id;
    if(!ObjectID.isValid(id)){
      throw new Error();
    }

    let body = _.pick(req.body,['title','text']);
    let encryptionKey = getEncryptionKey(req.user,req.token);
    encryptNoteBody(body,encryptionKey)

    let note = await Note.findOneAndUpdate({
      _id:id,
      creatorId:req.user._id
    },{
      $set:body
    },{
      new:true
    });

    if(!note){
      throw new Error();
    }
    res.send(note);
  }catch(e){
    res.status(400).send();
  }
});

app.get('/notes/:id',authentication,async(req,res)=>{
  try{
    let id = req.params.id;
    if(!ObjectID.isValid(id)){
      throw new Error();
    }
    let note = await Note.findOne({
      _id:id,
      creatorId:req.user._id
    });

    let encryptionKey = getEncryptionKey(req.user,req.token);
    note.decryptNote(encryptionKey);

    res.send(note);
  }catch(e){
    res.status(400).send();
  }
});

app.delete('/notes/:id',authentication, async(req,res)=>{
  try{
    let id = req.params.id;
    if(!ObjectID.isValid(id)){
      throw new Error();
    }

    let note = await Note.findOneAndRemove({
      _id:id,
      creatorId:req.user._id
    });

    if(!note){
      throw new Error();
    }

    res.send(note);
  }catch(e){
    res.status(400).send();
  }
});

app.listen(process.env.PORT,()=>{
  console.log(`Started on port ${process.env.PORT}`);
});

module.exports = {app};
