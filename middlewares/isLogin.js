const jwt = require('jsonwebtoken')
const pool = require('../auth/db')

const isLoggedIn = async(req, res, next) => {

    const token = req.cookies.token;
    if( !token ) {
        return res.status(400).send({
            status: "Failure",
            messag: "Please login first."
        })
    }
    const {name, email} = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query('select id, name, email, age from users where email= $1', [email]);
    if( result.rowCount < 1 ) {
        return res.status(400).send({
            status: "Failure",
            message: "Something went wrong..."
        })
    }
    req.userInfo = result.rows[0];
    next();
}

module.exports = isLoggedIn;