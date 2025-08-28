import { pgTable, text, uuid, integer, decimal, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { relations } from 'drizzle-orm';
import { products } from './products';
import { packTypes } from './filters/pack-types'; // Your new pack types table

export const productVariants = pgTable('product_variants', {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    sku: text('sku').notNull().unique(),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    salePrice: decimal('sale_price', { precision: 10, scale: 2 }),
    packTypeId: uuid('pack_type_id').notNull().references(() => packTypes.id), // Replace colorId and sizeId
    inStock: integer('in_stock').notNull().default(0),
    weight: decimal('weight', { precision: 8, scale: 2 }),
    dimensions: jsonb('dimensions').$type<{ length: number; width: number; height: number }>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
    product: one(products, {
        fields: [productVariants.productId],
        references: [products.id],
    }),
    packType: one(packTypes, {
        fields: [productVariants.packTypeId],
        references: [packTypes.id],
    }),
    // Remove color and size relations since trading cards don't have these
}));

export const insertVariantSchema = z.object({
    productId: z.string().uuid(),
    sku: z.string().min(1),
    price: z.string().regex(/^\d+(\.\d{1,2})?$/),
    salePrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    packTypeId: z.string().uuid().optional(),
    inStock: z.number().int().nonnegative().default(0),
    weight: z.number().positive().optional(),
    dimensions: z.object({
        length: z.number().positive(),
        width: z.number().positive(),
        height: z.number().positive(),
    }).optional(),
});

export const selectVariantSchema = insertVariantSchema.extend({
    id: z.string().uuid(),
    createdAt: z.date(),
});

export type InsertVariant = z.infer<typeof insertVariantSchema>;
export type SelectVariant = z.infer<typeof selectVariantSchema>;