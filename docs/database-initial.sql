CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;
DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = 'commerce') THEN
        CREATE SCHEMA commerce;
    END IF;
END $EF$;

CREATE TABLE commerce."Stores" (
    "Id" uuid NOT NULL,
    "OwnerUserId" uuid NOT NULL,
    "Name" character varying(80) NOT NULL,
    "Slug" character varying(100) NOT NULL,
    "ContactEmail" character varying(254) NOT NULL,
    "Currency" character varying(3) NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_Stores" PRIMARY KEY ("Id"),
    CONSTRAINT "CK_Stores_Currency" CHECK ("Currency" IN ('SGD', 'USD', 'PHP'))
);

CREATE TABLE commerce."Products" (
    "Id" uuid NOT NULL,
    "StoreId" uuid NOT NULL,
    "Title" character varying(100) NOT NULL,
    "Slug" character varying(120) NOT NULL,
    "Description" character varying(4000) NOT NULL,
    "Sku" character varying(80) NOT NULL,
    "PriceMinorUnits" bigint NOT NULL,
    "StockQuantity" integer NOT NULL,
    "Status" character varying(16) NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_Products" PRIMARY KEY ("Id"),
    CONSTRAINT "CK_Products_Price" CHECK ("PriceMinorUnits" > 0),
    CONSTRAINT "CK_Products_Status" CHECK ("Status" IN ('Draft', 'Active', 'Archived')),
    CONSTRAINT "CK_Products_Stock" CHECK ("StockQuantity" >= 0),
    CONSTRAINT "FK_Products_Stores_StoreId" FOREIGN KEY ("StoreId") REFERENCES commerce."Stores" ("Id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "IX_Products_StoreId_Slug" ON commerce."Products" ("StoreId", "Slug");

CREATE INDEX "IX_Products_StoreId_Status" ON commerce."Products" ("StoreId", "Status");

CREATE UNIQUE INDEX "IX_Stores_OwnerUserId" ON commerce."Stores" ("OwnerUserId");

CREATE UNIQUE INDEX "IX_Stores_Slug" ON commerce."Stores" ("Slug");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261004080535_InitialStoresAndProducts', '10.0.12');

COMMIT;

