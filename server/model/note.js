const mongoose = require('mongoose');
const _ = require('lodash');

const {encryptText,decryptText} = require('./../utils/utils');

var NoteSchema = new mongoose.Schema({
  creatorId:{
    type: mongoose.Schema.Types.ObjectId
  },
  title:{
    type:String,
    required:true
  },
  text:{
    type:String,
    required:true
  }
});

NoteSchema.methods.toJSON = function(){
  let user = this;
  return _.pick(user,['_id','title','text']);
};

NoteSchema.methods.encryptNote = function(encryptionKey){
  let note = this;
  Object.keys(note.toObject()).forEach((key)=>{
    if(key==='title'||key==='text'){
      note[key] = encryptText(note[key],encryptionKey);
    }
  });
};

NoteSchema.methods.decryptNote = function(encryptionKey){
  let note = this;
  Object.keys(note.toObject()).forEach((key)=>{
    if(key==='title'||key==='text'){
      note[key] = decryptText(note[key],encryptionKey);
    }
  });
};

var Note = mongoose.model('Note', NoteSchema);

module.exports = {Note};
