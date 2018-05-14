let env = process.env.NODE_ENV || "development";

if(env==="development" || env==="test"){
  let config = require('./config.json');
  let configObj = config[env];
  Object.keys(configObj).forEach((key)=>{
    process.env[key] = configObj[key];
  });
}
