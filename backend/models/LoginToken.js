const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LoginToken = sequelize.define(
  'LoginToken',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'login_tokens',
    timestamps: true,
    updatedAt: false,
  }
);

module.exports = LoginToken;
