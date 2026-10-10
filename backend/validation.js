function validateName(name) {
  if (typeof name !== "string" || name.trim().length < 20 || name.trim().length > 60) {
    return "Name must be between 20 and 60 characters.";
  }
  return null;
}

function validateAddress(address) {
  if (typeof address !== "string" || address.length > 400) {
    return "Address must be 400 characters or fewer.";
  }
  return null;
}

function validateEmail(email) {
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Enter a valid email address.";
  }
  return null;
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8 || password.length > 16 ||
      !/[A-Z]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "Password must be 8–16 characters and include an uppercase letter and a special character.";
  }
  return null;
}

function validateRating(rating) {
  const n = Number(rating);
  if (!Number.isInteger(n) || n < 1 || n > 5) return "Rating must be a whole number from 1 to 5.";
  return null;
}

module.exports = { validateName, validateAddress, validateEmail, validatePassword, validateRating };
