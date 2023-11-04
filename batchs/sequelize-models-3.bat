@echo off
setlocal

REM Crear archivo para tabla PRECIO
echo const { DataTypes } = require('sequelize'); > src\models\precio.js
echo const sequelize = require('../config/database'); >> src\models\precio.js
echo module.exports = sequelize.define('Precio', { >> src\models\precio.js
echo    ID_PRECIO: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true }, >> src\models\precio.js
echo    ID_STOCK: DataTypes.BIGINT, >> src\models\precio.js
echo    FECHA_DESDE: DataTypes.DATE, >> src\models\precio.js
echo    FECHA_HASTA: DataTypes.DATE, >> src\models\precio.js
echo    PRECIO: DataTypes.DECIMAL(10, 2) >> src\models\precio.js
echo }, { >> src\models\precio.js
echo    tableName: 'PRECIO', >> src\models\precio.js
echo    timestamps: false >> src\models\precio.js
echo }); >> src\models\precio.js

REM Crear archivo para tabla CALCULO PRECIO
echo const { DataTypes } = require('sequelize'); > src\models\calculo_precio.js
echo const sequelize = require('../config/database'); >> src\models\calculo_precio.js
echo module.exports = sequelize.define('CalculoPrecio', { >> src\models\calculo_precio.js
echo    ID_CALCULO_PRECIO: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true }, >> src\models\calculo_precio.js
echo    ID_STOCK_A_CALCULAR: DataTypes.BIGINT, >> src\models\calculo_precio.js
echo    FORMULA: DataTypes.STRING(1000), >> src\models\calculo_precio.js
echo    COTIZ_DOLAR: DataTypes.DECIMAL(10, 2), >> src\models\calculo_precio.js
echo    COMPLEJIDAD: DataTypes.INTEGER, >> src\models\calculo_precio.js
echo    TIEMPO_IMPRESION: DataTypes.DECIMAL(10, 2), >> src\models\calculo_precio.js
echo    FECHA_DESDE: DataTypes.DATE, >> src\models\calculo_precio.js
echo    FECHA_HASTA: DataTypes.DATE >> src\models\calculo_precio.js
echo }, { >> src\models\calculo_precio.js
echo    tableName: 'CALCULO PRECIO', >> src\models\calculo_precio.js
echo    timestamps: false >> src\models\calculo_precio.js
echo }); >> src\models\calculo_precio.js

REM Crear archivo para tabla MATERIALES PRODUCTO
echo const { DataTypes } = require('sequelize'); > src\models\materiales_producto.js
echo const sequelize = require('../config/database'); >> src\models\materiales_producto.js
echo module.exports = sequelize.define('MaterialesProducto', { >> src\models\materiales_producto.js
echo    ID_MAT_PROD: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true }, >> src\models\materiales_producto.js
echo    ID_STOCK: DataTypes.BIGINT, >> src\models\materiales_producto.js
echo    ID_CALCULO_PRECIO: DataTypes.BIGINT, >> src\models\materiales_producto.js
echo    CANTIDAD: DataTypes.DECIMAL(10, 2), >> src\models\materiales_producto.js
echo    CD_UNID_MEDIDA: DataTypes.BIGINT >> src\models\materiales_producto.js
echo }, { >> src\models\materiales_producto.js
echo    tableName: 'MATERIALES PRODUCTO', >> src\models\materiales_producto.js
echo    timestamps: false >> src\models\materiales_producto.js
echo }); >> src\models\materiales_producto.js

endlocal
