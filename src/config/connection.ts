import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(
    process.env.DB_NAME || 'MYMBPM',
    process.env.DB_USER || 'SA',
    process.env.DB_PASS || '{4lt0p4SW0rD}-[v13j4]',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mssql',
        logging: false,
    }
);

export default sequelize;
