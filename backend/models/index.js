const sequelize = require('../config/database');
const User = require('./User');
const Certificate = require('./Certificate');

// Associations
User.hasMany(Certificate, { foreignKey: 'issuedBy', as: 'certificates' });
Certificate.belongsTo(User, { foreignKey: 'issuedBy', as: 'issuer' });

module.exports = {
  sequelize,
  User,
  Certificate,
};
