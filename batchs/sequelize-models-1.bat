@echo off
setlocal

REM Crear directorio models si no existe
if not exist src\models mkdir src\models

REM Crear archivo para tabla PRECIOS
echo const { DataTypes } = require('sequelize'); > src\models\precios.js
echo const sequelize = require('../config/database'); >> src\models\precios.js
echo module.exports = sequelize.define('Precios', { >> src\models\precios.js
echo    ID_PRECIO: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true }, >> src\models\precios.js
echo    ID_STOCK: DataTypes.BIGINT, >> src\models\precios.js
echo    FECHA_DESDE: DataTypes.DATE, >> src\models\precios.js
echo    FECHA_HASTA: DataTypes.DATE, >> src\models\precios.js
echo    PRECIO: DataTypes.DECIMAL(10, 2) >> src\models\precios.js
echo }, { >> src\models\precios.js
echo    tableName: 'PRECIO', >> src\models\precios.js
echo    timestamps: false >> src\models\precios.js
echo }); >> src\models\precios.js

REM Crear archivo para tabla STOCK
echo const { DataTypes } = require('sequelize'); > src\models\stock.js
echo const sequelize = require('../config/database'); >> src\models\stock.js
echo module.exports = sequelize.define('Stock', { >> src\models\stock.js
echo    ID_STOCK: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true }, >> src\models\stock.js
echo    CD_TIPO_STOCK: DataTypes.BIGINT, >> src\models\stock.js
echo    CD_CATEGORIA: DataTypes.BIGINT, >> src\models\stock.js
echo    CD_SUB_CATEGORIA: DataTypes.BIGINT, >> src\models\stock.js
echo    NOMBRE: DataTypes.STRING(200), >> src\models\stock.js
echo    DESCRIPCION_METADATA: DataTypes.STRING(3000), >> src\models\stock.js
echo    CANTIDAD: DataTypes.DECIMAL(10, 2), >> src\models\stock.js
echo    CD_UNID_MEDIDA: DataTypes.BIGINT, >> src\models\stock.js
echo    COD_FOTOS: DataTypes.STRING(200), >> src\models\stock.js
echo    FECHA_CREACION: DataTypes.DATE, >> src\models\stock.js
echo    CATALOGO: DataTypes.BOOLEAN, >> src\models\stock.js
echo    CANT_RECOM: DataTypes.DECIMAL(10, 2) >> src\models\stock.js
echo }, { >> src\models\stock.js
echo    tableName: 'STOCK', >> src\models\stock.js
echo    timestamps: false >> src\models\stock.js
echo }); >> src\models\stock.js

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
echo    ID_MATERIAL_PRODUCTO: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true }, >> src\models\materiales_producto.js
echo    ID_PRODUCTO: DataTypes.BIGINT, >> src\models\materiales_producto.js
echo    ID_MATERIAL: DataTypes.BIGINT, >> src\models\materiales_producto.js
echo    // ...otros campos... >> src\models\materiales_producto.js
echo }, { >> src\models\materiales_producto.js
echo    tableName: 'MATERIALES PRODUCTO', >> src\models\materiales_producto.js
echo    timestamps: false >> src\models\materiales_producto.js
echo }); >> src\models\materiales_producto.js

endlocal
