using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StoreCraft.Api.Migrations
{
    /// <inheritdoc />
    public partial class PagesShippingAndDemoOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DraftDocument",
                schema: "commerce",
                table: "Stores",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "FreeShippingThreshold",
                schema: "commerce",
                table: "Stores",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<Guid>(
                name: "PublishedVersionId",
                schema: "commerce",
                table: "Stores",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ShippingMinorUnits",
                schema: "commerce",
                table: "Stores",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.CreateTable(
                name: "Orders",
                schema: "commerce",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    IdempotencyKey = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestHash = table.Column<string>(type: "text", nullable: false),
                    Reference = table.Column<string>(type: "text", nullable: false),
                    CustomerName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CustomerEmail = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    Address = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Currency = table.Column<string>(type: "text", nullable: false),
                    Subtotal = table.Column<long>(type: "bigint", nullable: false),
                    Shipping = table.Column<long>(type: "bigint", nullable: false),
                    Total = table.Column<long>(type: "bigint", nullable: false),
                    ItemsJson = table.Column<string>(type: "jsonb", nullable: false),
                    PaymentState = table.Column<string>(type: "text", nullable: false),
                    FulfillmentState = table.Column<string>(type: "text", nullable: false),
                    TrackingNumber = table.Column<string>(type: "text", nullable: false),
                    TrackingUrl = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orders", x => x.Id);
                    table.CheckConstraint("CK_Orders_Fulfillment", "\"FulfillmentState\" IN ('Unfulfilled', 'Shipped', 'Delivered')");
                    table.CheckConstraint("CK_Orders_Payment", "\"PaymentState\" IN ('Paid', 'Failed')");
                    table.CheckConstraint("CK_Orders_Total", "\"Subtotal\" >= 0 AND \"Shipping\" >= 0 AND \"Total\" = \"Subtotal\" + \"Shipping\"");
                    table.ForeignKey(
                        name: "FK_Orders_Stores_StoreId",
                        column: x => x.StoreId,
                        principalSchema: "commerce",
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PublishedPages",
                schema: "commerce",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    Document = table.Column<string>(type: "jsonb", nullable: false),
                    PublishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublishedPages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PublishedPages_Stores_StoreId",
                        column: x => x.StoreId,
                        principalSchema: "commerce",
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Stores_Shipping",
                schema: "commerce",
                table: "Stores",
                sql: "\"ShippingMinorUnits\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Stores_Threshold",
                schema: "commerce",
                table: "Stores",
                sql: "\"FreeShippingThreshold\" > 0");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_StoreId_IdempotencyKey",
                schema: "commerce",
                table: "Orders",
                columns: new[] { "StoreId", "IdempotencyKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PublishedPages_StoreId",
                schema: "commerce",
                table: "PublishedPages",
                column: "StoreId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Orders",
                schema: "commerce");

            migrationBuilder.DropTable(
                name: "PublishedPages",
                schema: "commerce");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Stores_Shipping",
                schema: "commerce",
                table: "Stores");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Stores_Threshold",
                schema: "commerce",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "DraftDocument",
                schema: "commerce",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "FreeShippingThreshold",
                schema: "commerce",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "PublishedVersionId",
                schema: "commerce",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "ShippingMinorUnits",
                schema: "commerce",
                table: "Stores");
        }
    }
}
