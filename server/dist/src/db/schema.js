"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenants = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.tenants = (0, pg_core_1.pgTable)('tenants', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    businessName: (0, pg_core_1.text)('business_name').notNull(),
    wabaId: (0, pg_core_1.text)('waba_id').notNull().unique(),
    phoneNumberId: (0, pg_core_1.text)('phone_number_id').notNull().unique(),
    accessToken: (0, pg_core_1.text)('access_token').notNull(), // This should be encrypted app-side before storage
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
