const { Sequelize } = require('sequelize');
require('dotenv').config();

const useSsl = String(process.env.DB_SSL || 'false').toLowerCase() === 'true';

const sequelizeConfig = process.env.DATABASE_URL
  ? {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: false,
      dialectOptions: useSsl
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          }
        : {},
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    };

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, sequelizeConfig)
  : new Sequelize(
      process.env.DB_NAME || 'twinverify',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASS || 'postgres',
      sequelizeConfig
    );

module.exports = sequelize;
