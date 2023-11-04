@echo off
setlocal

REM Crear archivo para tabla CATEGORIA
echo const { DataTypes } = require('sequelize'); > src\models\categoria.js
echo const sequelize = require('../config/database'); >> src\models\categoria.js
echo module.exports = sequelize.define('Categoria', { >> src\models\categoria.js
echo    CD_CATEGORIA: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true }, >> src\models\categoria.js
echo    DESCRIPCION: DataTypes.STRING(200) >> src\models\categoria.js
echo }, { >> src\models\categoria.js
echo    tableName: 'CATEGORIA', >> src\models\categoria.js
echo    timestamps: false >> src\models\categoria.js
echo }); >> src\models\categoria.js

REM Crear archivo para tabla SUB CATEGORIA
echo const { DataTypes } = require('sequelize'); > src\models\sub_categoria.js
echo const sequelize = require('../config/database'); >> src\models\sub_categoria.js
echo module.exports = sequelize.define('SubCategoria', { >> src\models\sub_categoria.js
echo    CD_SUB_CATEGORIA: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true }, >> src\models\sub_categoria.js
echo    DESCRIPCION: DataTypes.STRING(200), >> src\models\sub_categoria.js
echo    CD_CATEGORIA: DataTypes.BIGINT >> src\models\sub_categoria.js
echo }, { >> src\models\sub_categoria.js
echo    tableName: 'SUB CATEGORIA', >> src\models\sub_categoria.js
echo    timestamps: false >> src\models\sub_categoria.js
echo }); >> src\models\sub_categoria.js

REM Crear archivo para tabla TIPO STOCK
echo const { DataTypes } = require('sequelize'); > src\models\tipo_stock.js
echo const sequelize = require('../config/database'); >> src\models\tipo_stock.js
echo module.exports = sequelize.define('TipoStock', { >> src\models\tipo_stock.js
echo    CD_TIPO_STOCK: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true }, >> src\models\tipo_stock.js
echo    DESCRIPCION: DataTypes.STRING(200) >> src\models\tipo_stock.js
echo }, { >> src\models\tipo_stock.js
echo    tableName: 'TIPO STOCK', >> src\models\tipo_stock.js
echo    timestamps: false >> src\models\tipo_stock.js
echo }); >> src\models\tipo_stock.js

REM Crear archivo para tabla UNIDAD MEDIDA
echo const { DataTypes } = require('sequelize'); > src\models\unidad_medida.js
echo const sequelize = require('../config/database'); >> src\models\unidad_medida.js
echo module.exports = sequelize.define('UnidadMedida', { >> src\models\unidad_medida.js
echo    CD_UNID_MEDIDA: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true }, >> src\models\unidad_medida.js
echo    DESCRIPCION: DataTypes.STRING(100) >> src\models\unidad_medida.js
echo }, { >> src\models\unidad_medida.js
echo    tableName: 'UNIDAD MEDIDA', >> src\models\unidad_medida.js
echo    timestamps: false >> src\models\unidad_medida.js
echo }); >> src\models\unidad_medida.js

endlocal
