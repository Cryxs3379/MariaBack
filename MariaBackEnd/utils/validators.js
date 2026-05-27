const isValidEmail = (email) => {
  if (!email || typeof email !== "string") {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const normalizeEmail = (email) => {
  if (!email || typeof email !== "string") {
    return "";
  }

  return email.trim().toLowerCase();
};

module.exports = {
  isValidEmail,
  normalizeEmail,
};
