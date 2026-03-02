const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Certificate = sequelize.define(
  'Certificate',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    recipientName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    recipientEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    eventName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    eventDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    certificateType: {
      type: DataTypes.ENUM('participation', 'achievement', 'completion', 'appreciation', 'other'),
      defaultValue: 'participation',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    certificateFile: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    originalFileName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    issuedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    isValid: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'certificates',
    timestamps: true,
    indexes: [
      { fields: ['issuedBy'] },
      { fields: ['eventName'] },
    ],
  }
);

module.exports = Certificate;
