const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port:587,  
  secure:false,//STARTTLS,not SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls:{
    rejectUnauthorized:false
  }
});

const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"ChronoLux" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
};

module.exports = sendEmail;