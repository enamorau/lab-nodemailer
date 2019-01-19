const express = require("express");
const passport = require("passport");
const router = express.Router();
const User = require("../models/User");
const nodemailer = require("nodemailer");

// Bcrypt to encrypt passwords
const bcrypt = require("bcrypt");
const bcryptSalt = 10;

const confCodeGen = () => {
  const characters =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let token = "";
  for (let i = 0; i < 25; i++) {
    token += characters[Math.floor(Math.random() * characters.length)];
  }
  return token;
};

router.get("/login", (req, res, next) => {
  res.render("auth/login", { message: req.flash("error") });
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/auth/login",
    failureFlash: true,
    passReqToCallback: true
  })
);

router.get("/signup", (req, res, next) => {
  res.render("auth/signup");
});

router.post("/signup", (req, res, next) => {
  const { username, password, email } = req.body;

  if (username === "" || password === "") {
    res.render("auth/signup", { message: "Indicate username and password" });
    return;
  }

  User.findOne({ username }, "username", (err, user) => {
    if (user !== null) {
      res.render("auth/signup", { message: "The username already exists" });
      return;
    }

    const salt = bcrypt.genSaltSync(bcryptSalt);
    const hashPass = bcrypt.hashSync(password, salt);

    confirmationCode = confCodeGen();
    console.log(`test confCode ---> ${confirmationCode}`);

    const newUser = new User({
      username,
      password: hashPass,
      email,
      confirmationCode
    });

    newUser
      .save()
      .then(() => {
        let email = req.body.email;
        let transporter = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: process.env.GMAIL,
            pass: process.env.GMAIL_PASS
          }
        });

        transporter
          .sendMail({
            from: '"MR fake Account" <netufaccako@gmail.com>',
            to: email,
            subject: "Confirmation Code",
            text: `${confirmationCode}`,
            html: `<b>http://localhost:3000/auth/confirm/${confirmationCode}</b>`
          })

          .then(() => {
            res.redirect("/");
          })

          .catch(error => console.log(error));
      })
      .catch(err => {
        console.log("save oops", err);
        res.render("auth/signup", { message: "oOPS, Something went wrong" });
      });
  });
});

router.get('/auth/confirm/:confirmCode', (req, res, next) => {
  const confirmationCode = req.param.confirmCode;

  User.findOne({ confirmationCode }, "confirmationCode", (err, confCode) => {
    if (confCode !== null) {
      User.update({ confirmationCode }, { $set: { confirmationCode } })
        .then(() => {
          res.render("confirmation-success", {
            message: "Your email adress is confirmed"
          });
          setTimeout(() => {
            res.redirect("/");
          }, 2000);
        })
        .catch(error => {
          console.log(error);
        });
    }
  }).then(() => {});
});

router.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

module.exports = router;
