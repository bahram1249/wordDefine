const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function(req, res, next){

    const token = req.header('x-auth-token');
    if(!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    try{
        const decoded = jwt.verify(token, config.get('jsonWebToken.privateKey'));
        req.user = decoded;
        next();
    }
    catch(e){
        res.status(400).json({ error: 'Invalid Token' });
    }
    
} 