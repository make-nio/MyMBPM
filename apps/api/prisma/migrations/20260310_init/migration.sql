BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[Healthcheck] (
    [id] INT NOT NULL IDENTITY(1,1),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Healthcheck_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Healthcheck_pkey] PRIMARY KEY CLUSTERED ([id])
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

