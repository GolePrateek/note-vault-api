const {User} = require('./../model/user');

const authentication = async(req,res,next)=>{
  try{
    let token = req.get('x-auth');

    let user = await User.findByTokenAlt(token);
    if(!user){
      throw new Error('User not found');
    }
    req.user = user;
    req.token = token;
    next();
  }catch(e){
    res.status(401).send();
  }
};

module.exports = {authentication};
