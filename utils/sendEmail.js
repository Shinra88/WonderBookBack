//sendEmail.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

async function sendConfirmationEmail(to, name) {
  const mailOptions = {
    from: `"WonderBook" <${process.env.MAIL_USER}>`,
    to,
    subject: "Confirmation d'inscription à WonderBook",
    html: `<p>Bonjour <strong>${name}</strong>,</p>
             <p>Merci de vous être inscrit sur <strong>WonderBook</strong> !</p>
             <p>Vous pouvez maintenant explorer, partager et découvrir des livres.</p>
             <p>À bientôt 👋</p>`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email envoyé :', info.response);
    return true;
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email :", error);
    return false;
  }
}

module.exports = sendConfirmationEmail;
