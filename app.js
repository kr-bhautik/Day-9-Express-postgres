const express = require("express")
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const cookieParser = require('cookie-parser')
const isLoggedIn = require('./middlewares/isLogin.js')
require('dotenv').config()

const app = express();
const pool = require('./auth/db.js')

const PORT = process.env.PORT;
const JWT_SECRET = process.env.JWT_SECRET

app.use(express.json());
app.use(express.urlencoded({extended : true}))
app.use(cookieParser());

app.listen(PORT, () => console.log(`Listening on port ${PORT}...`))

app.get('/', (req, res) => {
    res.send("Welcome.");
})

// Register
app.post('/register', async(req, res) => {
    const { name, email, password, age} = req.body;
    // console.log(req.body);

    await pool.query('create table if not exists users ( id serial primary key, name varchar(30), email varchar(30) UNIQUE, password varchar, age integer)')

    if( !name || !email || !password || !age ) {
        return res.status(400).send({
            status: "failure",
            message: "All fields are mendatory."
        })
    }
    try {
        bcrypt.genSalt(10, (err, salt) => {

            bcrypt.hash(password, salt, async(err, hash) => {
                // console.log(hash);
                const result = await pool.query(`insert into users(name, email, password, age)  values( $1, $2, $3, $4) returning id, name, email, age`, [name, email, hash, age]);
                res.status(200).send({
                    status: "success",
                    user: result.rows[0]
                });
            })
        })
    } catch (err) {
        // console.log(err);
        res.status(400).send({
            status: "failure",
            error: err
        })
    }
})

// Login
app.post('/login', async(req, res) => {
    const {email, password} = req.body;

    if( !email || !password ){
        return res.status(400).send({
            status: "failure",
            message: " All fields are mendatory"
        })
    }
    const user = await pool.query('select * from users where email = $1' , [email.trim()]);

    if( !user || user.rowCount < 1 ) {
        return res.status(400).send({
            status: "failure",
            message: "User doesn't exists, please register.",
        })
    }
    bcrypt.compare(password, user.rows[0].password, (err, isMatch) => {
        if (err) {
            // console.log(err);
            return res.status(500).send({
                status: "failure",
                message: "Something went wrong."
            });
        }
        if( isMatch ) {
            jwt.sign( { email : email , name : user.rows[0].name}, JWT_SECRET, (err, token) => {
                // console.log(token);
                if (err) {
                    console.log(err);
                    return res.status(500).send({
                        status: "failure",
                        message: "Something went wrong while generating token."
                    });
                }
                res.cookie('token', token , {
                    maxAge : 3600000
                });

                // console.log('Cookie set successfully,,', token)
                return res.status(200).send({
                    status: "success",
                    message: "Login successfully..",
                    userInfo : {
                        name: user.rows[0].name,
                        email: user.rows[0].email,
                        age: user.rows[0].age
                    }
                })
            })
        }
        else {
            res.status(400).send({
                status: "failure",
                message: "Something went wrong."
            })
        }
        if( err ) {
            console.log(err);
        }
    })
})

// Logout
app.get('/logout', (req, res) => {
    if( !req.cookies.token ) {
        return res.status(400).send({
            status: "failure",
            message: "Login first."
        })
    }
    res.clearCookie('token');
    res.status(200).send({
        status: "success",
        message: "Logged out successfully.."
    })
})

// Get all users
app.get('/users', async(req, res) => {
    const users = await pool.query('select id, name, email, age from users');
    if( users.rowCount < 1 ) {
        return res.status(204).send({
            status: "success",
            message: "No users."
        })
    }
    // console.log(users.rows);
    res.status(200).send({
        status: "success",
        users : users.rows
    });
})

// Profile
app.get('/profile', isLoggedIn, (req, res) => {
    res.status(200).send({
        status: "success",
        message: "Profile page loaded successfully.",
        user : req.userInfo
    })
})