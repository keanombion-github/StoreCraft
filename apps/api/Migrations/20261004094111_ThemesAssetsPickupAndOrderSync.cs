using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StoreCraft.Api.Migrations
{
    /// <inheritdoc />
    public partial class ThemesAssetsPickupAndOrderSync : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
-- Only public product/widget/logo imagery belongs in this bucket.
-- Supabase documents SQL bucket creation. Object writes always use its Storage API.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('storecraft-assets', 'storecraft-assets', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION commerce.can_upload_storecraft_asset()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM commerce."Stores" WHERE "OwnerUserId" = auth.uid()); $$;
REVOKE ALL ON FUNCTION commerce.can_upload_storecraft_asset() FROM PUBLIC;
GRANT USAGE ON SCHEMA commerce TO authenticated;
GRANT EXECUTE ON FUNCTION commerce.can_upload_storecraft_asset() TO authenticated;
CREATE POLICY storecraft_asset_upload ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'storecraft-assets'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$'
  AND commerce.can_upload_storecraft_asset()
);

""");
            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_Fulfillment",
                schema: "commerce",
                table: "Orders");

            migrationBuilder.AddColumn<string>(
                name: "PickupAddress",
                schema: "commerce",
                table: "Stores",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "PickupEnabled",
                schema: "commerce",
                table: "Stores",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ImageAlt",
                schema: "commerce",
                table: "Products",
                type: "character varying(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ImagePath",
                schema: "commerce",
                table: "Products",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FulfillmentMethod",
                schema: "commerce",
                table: "Orders",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Delivery");

            migrationBuilder.CreateTable(
                name: "OrderEvents",
                schema: "commerce",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    StoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Payload = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    AcknowledgedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderEvents_Orders_OrderId",
                        column: x => x.OrderId,
                        principalSchema: "commerce",
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrderEvents_Stores_StoreId",
                        column: x => x.StoreId,
                        principalSchema: "commerce",
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_Fulfillment",
                schema: "commerce",
                table: "Orders",
                sql: "\"FulfillmentState\" IN ('Unfulfilled', 'Shipped', 'Delivered', 'ReadyForPickup', 'Collected')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_Method",
                schema: "commerce",
                table: "Orders",
                sql: "\"FulfillmentMethod\" IN ('Delivery', 'Pickup')");

            migrationBuilder.CreateIndex(
                name: "IX_OrderEvents_OrderId",
                schema: "commerce",
                table: "OrderEvents",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderEvents_StoreId_AcknowledgedAt_Id",
                schema: "commerce",
                table: "OrderEvents",
                columns: new[] { "StoreId", "AcknowledgedAt", "Id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Uploaded files and the bucket are retained; remove objects through Storage API only.
            migrationBuilder.Sql("DROP POLICY IF EXISTS storecraft_asset_upload ON storage.objects; DROP FUNCTION IF EXISTS commerce.can_upload_storecraft_asset();");
            migrationBuilder.DropTable(
                name: "OrderEvents",
                schema: "commerce");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_Fulfillment",
                schema: "commerce",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_Method",
                schema: "commerce",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "PickupAddress",
                schema: "commerce",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "PickupEnabled",
                schema: "commerce",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "ImageAlt",
                schema: "commerce",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ImagePath",
                schema: "commerce",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "FulfillmentMethod",
                schema: "commerce",
                table: "Orders");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_Fulfillment",
                schema: "commerce",
                table: "Orders",
                sql: "\"FulfillmentState\" IN ('Unfulfilled', 'Shipped', 'Delivered')");
        }
    }
}
