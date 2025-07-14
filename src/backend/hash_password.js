import bcrypt from "bcrypt";

const plainPassword = 'sifre222';
const saltRounds = 10;

bcrypt.hash(plainPassword, saltRounds)
  .then(hash => {
    console.log('Hash:', hash);
  })
  .catch(err => {
    console.error('Hata oluştu:', err);
  });
